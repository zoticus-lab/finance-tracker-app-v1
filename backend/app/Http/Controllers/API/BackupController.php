<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Category;
use App\Models\Credit;
use App\Models\CreditPayment;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class BackupController extends Controller
{
    public function export(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $userId = $user->user_id;

        return response()->json([
            'success' => true,
            'data' => $this->buildBackupPayload($userId, $user->email),
        ]);
    }

    public function import(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $payload = $request->input('backup');
        if (!is_array($payload)) {
            return response()->json(['success' => false, 'message' => 'Invalid backup payload'], 422);
        }

        $dryRun = (bool) $request->boolean('dry_run', false);

        $sections = [
            'accounts', 'categories', 'transactions', 'debts', 'debt_payments', 'credits', 'credit_payments',
        ];

        foreach ($sections as $section) {
            if (!isset($payload[$section]) || !is_array($payload[$section])) {
                $payload[$section] = [];
            }
        }

        $userId = $user->user_id;

        if (!$dryRun) {
            $snapshot = $this->buildBackupPayload($userId, $user->email);
            $this->writeLastSnapshot($userId, $snapshot);
        }

        DB::beginTransaction();
        try {
            $summary = $this->mergePayload($payload, $userId);

            if ($dryRun) {
                DB::rollBack();
                return response()->json([
                    'success' => true,
                    'message' => 'Dry run completed',
                    'data' => $summary,
                    'dry_run' => true,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Backup imported successfully',
                'data' => $summary,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function rollbackLastImport(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $userId = $user->user_id;
        $snapshotPath = $this->snapshotPath($userId);
        if (!File::exists($snapshotPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Rollback snapshot not found for this user',
            ], 404);
        }

        $snapshot = json_decode((string) File::get($snapshotPath), true);
        if (!is_array($snapshot)) {
            return response()->json([
                'success' => false,
                'message' => 'Rollback snapshot is invalid',
            ], 422);
        }

        $sections = ['accounts', 'categories', 'transactions', 'debts', 'debt_payments', 'credits', 'credit_payments'];
        foreach ($sections as $section) {
            if (!isset($snapshot[$section]) || !is_array($snapshot[$section])) {
                $snapshot[$section] = [];
            }
        }

        DB::beginTransaction();
        try {
            // Hard reset user-owned data, then restore from snapshot.
            DebtPayment::where('user_id', $userId)->delete();
            CreditPayment::where('user_id', $userId)->delete();
            Transaction::where('user_id', $userId)->delete();
            Debt::where('user_id', $userId)->delete();
            Credit::where('user_id', $userId)->delete();
            Category::where('user_id', $userId)->where('is_system_default', false)->delete();
            Account::where('user_id', $userId)->delete();

            $summary = $this->mergePayload($snapshot, $userId);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Rollback import berhasil',
                'data' => $summary,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Rollback failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function buildBackupPayload(int $userId, string $userEmail): array
    {
        $accounts = Account::where('user_id', $userId)->get()->map(function ($a) {
            return [
                'export_key' => $this->accountKey($a->account_name, $a->account_type, $a->currency),
                'account_name' => $a->account_name,
                'account_type' => $a->account_type,
                'balance' => (float) $a->balance,
                'currency' => $a->currency,
                'color_code' => $a->color_code,
                'icon' => $a->icon,
                'institution_name' => $a->institution_name,
                'account_number' => $a->account_number,
                'is_active' => (bool) $a->is_active,
                'created_at' => optional($a->created_at)?->toIso8601String(),
                'updated_at' => optional($a->updated_at)?->toIso8601String(),
            ];
        })->values();

        $categories = Category::where('user_id', $userId)
            ->where('is_system_default', false)
            ->get()
            ->map(function ($c) {
                return [
                    'export_key' => $this->categoryKey($c->category_name, $c->category_type),
                    'category_name' => $c->category_name,
                    'category_type' => $c->category_type,
                    'icon' => $c->icon,
                    'color_code' => $c->color_code,
                    'created_at' => optional($c->created_at)?->toIso8601String(),
                    'updated_at' => optional($c->updated_at)?->toIso8601String(),
                ];
            })->values();

        $accountById = Account::where('user_id', $userId)->get()->keyBy('account_id');
        $categoryById = Category::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhere('is_system_default', true);
        })->get()->keyBy('category_id');

        $transactions = Transaction::where('user_id', $userId)->get()->map(function ($t) use ($accountById, $categoryById) {
            $account = $accountById->get($t->account_id);
            $category = $categoryById->get($t->category_id);

            return [
                'transaction_type' => $t->transaction_type,
                'amount' => (float) $t->amount,
                'transaction_date' => (string) $t->transaction_date,
                'description' => $t->description,
                'notes' => $t->notes,
                'account_export_key' => $account ? $this->accountKey($account->account_name, $account->account_type, $account->currency) : null,
                'category_export_key' => $category ? $this->categoryKey($category->category_name, $category->category_type) : null,
                'created_at' => optional($t->created_at)?->toIso8601String(),
                'updated_at' => optional($t->updated_at)?->toIso8601String(),
            ];
        })->values();

        $debts = Debt::where('user_id', $userId)->get()->map(function ($d) use ($accountById) {
            $account = $accountById->get($d->account_id);
            return [
                'export_key' => $this->debtKey($d->creditor_name, $d->total_amount, $d->start_date, $d->due_date, $d->description),
                'creditor_name' => $d->creditor_name,
                'total_amount' => (float) $d->total_amount,
                'paid_amount' => (float) $d->paid_amount,
                'remaining_amount' => (float) $d->remaining_amount,
                'description' => $d->description,
                'start_date' => (string) $d->start_date,
                'due_date' => $d->due_date ? (string) $d->due_date : null,
                'debt_status' => $d->debt_status,
                'priority' => $d->priority,
                'color_code' => $d->color_code,
                'progress_percentage' => (int) $d->progress_percentage,
                'account_export_key' => $account ? $this->accountKey($account->account_name, $account->account_type, $account->currency) : null,
                'created_at' => optional($d->created_at)?->toIso8601String(),
                'updated_at' => optional($d->updated_at)?->toIso8601String(),
            ];
        })->values();

        $credits = Credit::where('user_id', $userId)->get()->map(function ($c) use ($accountById) {
            $account = $accountById->get($c->account_id);
            return [
                'export_key' => $this->creditKey($c->debtor_name, $c->total_amount, $c->start_date, $c->due_date, $c->description),
                'debtor_name' => $c->debtor_name,
                'total_amount' => (float) $c->total_amount,
                'received_amount' => (float) $c->received_amount,
                'remaining_amount' => (float) $c->remaining_amount,
                'description' => $c->description,
                'start_date' => (string) $c->start_date,
                'due_date' => $c->due_date ? (string) $c->due_date : null,
                'credit_status' => $c->credit_status,
                'priority' => $c->priority,
                'color_code' => $c->color_code,
                'progress_percentage' => (int) $c->progress_percentage,
                'account_export_key' => $account ? $this->accountKey($account->account_name, $account->account_type, $account->currency) : null,
                'created_at' => optional($c->created_at)?->toIso8601String(),
                'updated_at' => optional($c->updated_at)?->toIso8601String(),
            ];
        })->values();

        $debtById = Debt::where('user_id', $userId)->get()->keyBy('debt_id');
        $creditById = Credit::where('user_id', $userId)->get()->keyBy('credit_id');

        $debtPayments = DebtPayment::where('user_id', $userId)->get()->map(function ($p) use ($debtById, $accountById) {
            $debt = $debtById->get($p->debt_id);
            $account = $accountById->get($p->account_id);
            return [
                'debt_export_key' => $debt ? $this->debtKey($debt->creditor_name, $debt->total_amount, $debt->start_date, $debt->due_date, $debt->description) : null,
                'account_export_key' => $account ? $this->accountKey($account->account_name, $account->account_type, $account->currency) : null,
                'payment_amount' => (float) $p->payment_amount,
                'payment_date' => (string) $p->payment_date,
                'notes' => $p->notes,
                'payment_method' => $p->payment_method,
                'created_at' => optional($p->created_at)?->toIso8601String(),
                'updated_at' => optional($p->updated_at)?->toIso8601String(),
            ];
        })->values();

        $creditPayments = CreditPayment::where('user_id', $userId)->get()->map(function ($p) use ($creditById, $accountById) {
            $credit = $creditById->get($p->credit_id);
            $account = $accountById->get($p->account_id);
            return [
                'credit_export_key' => $credit ? $this->creditKey($credit->debtor_name, $credit->total_amount, $credit->start_date, $credit->due_date, $credit->description) : null,
                'account_export_key' => $account ? $this->accountKey($account->account_name, $account->account_type, $account->currency) : null,
                'payment_amount' => (float) $p->payment_amount,
                'payment_date' => (string) $p->payment_date,
                'notes' => $p->notes,
                'payment_method' => $p->payment_method,
                'created_at' => optional($p->created_at)?->toIso8601String(),
                'updated_at' => optional($p->updated_at)?->toIso8601String(),
            ];
        })->values();

        return [
            'meta' => [
                'format' => 'uang-backup-v1',
                'exported_at' => now()->toIso8601String(),
                'user_email' => $userEmail,
            ],
            'accounts' => $accounts,
            'categories' => $categories,
            'transactions' => $transactions,
            'debts' => $debts,
            'debt_payments' => $debtPayments,
            'credits' => $credits,
            'credit_payments' => $creditPayments,
        ];
    }

    private function mergePayload(array $payload, int $userId): array
    {
        $summary = [
            'accounts' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'categories' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'transactions' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'debts' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'debt_payments' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'credits' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'credit_payments' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
        ];

        $accountMap = [];
        foreach ($payload['accounts'] as $row) {
            $key = $row['export_key'] ?? $this->accountKey($row['account_name'] ?? '', $row['account_type'] ?? '', $row['currency'] ?? 'IDR');
            if (!$key || empty($row['account_name']) || empty($row['account_type'])) {
                $summary['accounts']['skipped']++;
                continue;
            }

            $existing = Account::where('user_id', $userId)
                ->where('account_name', $row['account_name'])
                ->where('account_type', $row['account_type'])
                ->where('currency', strtoupper($row['currency'] ?? 'IDR'))
                ->first();

            $attrs = [
                'user_id' => $userId,
                'account_name' => $row['account_name'],
                'account_type' => $row['account_type'],
                'balance' => (float) ($row['balance'] ?? 0),
                'currency' => strtoupper($row['currency'] ?? 'IDR'),
                'color_code' => $row['color_code'] ?? null,
                'icon' => $row['icon'] ?? null,
                'institution_name' => $row['institution_name'] ?? null,
                'account_number' => $row['account_number'] ?? null,
                'is_active' => (bool) ($row['is_active'] ?? true),
            ];

            if (!$existing) {
                $created = Account::create($attrs);
                $accountMap[$key] = $created->account_id;
                $summary['accounts']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['accounts']['updated']++;
            } else {
                $summary['accounts']['skipped']++;
            }
            $accountMap[$key] = $existing->account_id;
        }

        $categoryMap = [];
        foreach ($payload['categories'] as $row) {
            $key = $row['export_key'] ?? $this->categoryKey($row['category_name'] ?? '', $row['category_type'] ?? 'expense');
            if (!$key || empty($row['category_name']) || empty($row['category_type'])) {
                $summary['categories']['skipped']++;
                continue;
            }

            $existing = Category::where('user_id', $userId)
                ->where('is_system_default', false)
                ->where('category_name', $row['category_name'])
                ->where('category_type', $row['category_type'])
                ->first();

            $attrs = [
                'user_id' => $userId,
                'parent_category_id' => null,
                'category_name' => $row['category_name'],
                'category_type' => $row['category_type'],
                'icon' => $row['icon'] ?? null,
                'color_code' => $row['color_code'] ?? null,
                'is_system_default' => false,
            ];

            if (!$existing) {
                $created = Category::create($attrs);
                $categoryMap[$key] = $created->category_id;
                $summary['categories']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['categories']['updated']++;
            } else {
                $summary['categories']['skipped']++;
            }
            $categoryMap[$key] = $existing->category_id;
        }

        Category::where('is_system_default', true)->get()->each(function ($cat) use (&$categoryMap) {
            $categoryMap[$this->categoryKey($cat->category_name, $cat->category_type)] = $cat->category_id;
        });

        $debtMap = [];
        foreach ($payload['debts'] as $row) {
            $key = $row['export_key'] ?? $this->debtKey($row['creditor_name'] ?? '', $row['total_amount'] ?? 0, $row['start_date'] ?? null, $row['due_date'] ?? null, $row['description'] ?? null);
            if (!$key || empty($row['creditor_name'])) {
                $summary['debts']['skipped']++;
                continue;
            }

            $existing = Debt::where('user_id', $userId)
                ->where('creditor_name', $row['creditor_name'])
                ->whereDate('start_date', (string) ($row['start_date'] ?? now()->toDateString()))
                ->where('total_amount', (float) ($row['total_amount'] ?? 0))
                ->first();

            $attrs = [
                'user_id' => $userId,
                'creditor_name' => $row['creditor_name'],
                'total_amount' => (float) ($row['total_amount'] ?? 0),
                'paid_amount' => (float) ($row['paid_amount'] ?? 0),
                'remaining_amount' => (float) ($row['remaining_amount'] ?? 0),
                'description' => $row['description'] ?? null,
                'start_date' => (string) ($row['start_date'] ?? now()->toDateString()),
                'due_date' => $row['due_date'] ?? null,
                'debt_status' => $row['debt_status'] ?? 'active',
                'account_id' => isset($accountMap[$row['account_export_key'] ?? '']) ? $accountMap[$row['account_export_key']] : null,
                'priority' => $row['priority'] ?? 'medium',
                'color_code' => $row['color_code'] ?? '#e74c3c',
                'progress_percentage' => (int) ($row['progress_percentage'] ?? 0),
            ];

            if (!$existing) {
                $created = Debt::create($attrs);
                $debtMap[$key] = $created->debt_id;
                $summary['debts']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['debts']['updated']++;
            } else {
                $summary['debts']['skipped']++;
            }
            $debtMap[$key] = $existing->debt_id;
        }

        $creditMap = [];
        foreach ($payload['credits'] as $row) {
            $key = $row['export_key'] ?? $this->creditKey($row['debtor_name'] ?? '', $row['total_amount'] ?? 0, $row['start_date'] ?? null, $row['due_date'] ?? null, $row['description'] ?? null);
            if (!$key || empty($row['debtor_name'])) {
                $summary['credits']['skipped']++;
                continue;
            }

            $existing = Credit::where('user_id', $userId)
                ->where('debtor_name', $row['debtor_name'])
                ->whereDate('start_date', (string) ($row['start_date'] ?? now()->toDateString()))
                ->where('total_amount', (float) ($row['total_amount'] ?? 0))
                ->first();

            $attrs = [
                'user_id' => $userId,
                'debtor_name' => $row['debtor_name'],
                'total_amount' => (float) ($row['total_amount'] ?? 0),
                'received_amount' => (float) ($row['received_amount'] ?? 0),
                'remaining_amount' => (float) ($row['remaining_amount'] ?? 0),
                'description' => $row['description'] ?? null,
                'start_date' => (string) ($row['start_date'] ?? now()->toDateString()),
                'due_date' => $row['due_date'] ?? null,
                'credit_status' => $row['credit_status'] ?? 'active',
                'account_id' => isset($accountMap[$row['account_export_key'] ?? '']) ? $accountMap[$row['account_export_key']] : null,
                'priority' => $row['priority'] ?? 'medium',
                'color_code' => $row['color_code'] ?? '#27ae60',
                'progress_percentage' => (int) ($row['progress_percentage'] ?? 0),
            ];

            if (!$existing) {
                $created = Credit::create($attrs);
                $creditMap[$key] = $created->credit_id;
                $summary['credits']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['credits']['updated']++;
            } else {
                $summary['credits']['skipped']++;
            }
            $creditMap[$key] = $existing->credit_id;
        }

        foreach ($payload['transactions'] as $row) {
            $accountId = isset($accountMap[$row['account_export_key'] ?? '']) ? $accountMap[$row['account_export_key']] : null;
            $categoryId = isset($categoryMap[$row['category_export_key'] ?? '']) ? $categoryMap[$row['category_export_key']] : null;

            $type = (string) ($row['transaction_type'] ?? '');
            $amount = (float) ($row['amount'] ?? 0);
            $date = (string) ($row['transaction_date'] ?? '');
            if (!in_array($type, ['income', 'expense', 'transfer'], true) || $amount <= 0 || !$date || !$accountId) {
                $summary['transactions']['skipped']++;
                continue;
            }

            $existing = Transaction::where('user_id', $userId)
                ->where('transaction_type', $type)
                ->where('amount', $amount)
                ->whereDate('transaction_date', $date)
                ->where('account_id', $accountId)
                ->where('category_id', $categoryId)
                ->where('description', $row['description'] ?? null)
                ->where('notes', $row['notes'] ?? null)
                ->first();

            $attrs = [
                'user_id' => $userId,
                'account_id' => $accountId,
                'transaction_type' => $type,
                'amount' => $amount,
                'category_id' => $categoryId,
                'transaction_date' => $date,
                'description' => $row['description'] ?? null,
                'notes' => $row['notes'] ?? null,
            ];

            if (!$existing) {
                Transaction::create($attrs);
                $summary['transactions']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['transactions']['updated']++;
            } else {
                $summary['transactions']['skipped']++;
            }
        }

        foreach ($payload['debt_payments'] as $row) {
            $debtId = isset($debtMap[$row['debt_export_key'] ?? '']) ? $debtMap[$row['debt_export_key']] : null;
            $accountId = isset($accountMap[$row['account_export_key'] ?? '']) ? $accountMap[$row['account_export_key']] : null;
            $amount = (float) ($row['payment_amount'] ?? 0);
            $date = (string) ($row['payment_date'] ?? '');

            if (!$debtId || !$accountId || $amount <= 0 || !$date) {
                $summary['debt_payments']['skipped']++;
                continue;
            }

            $existing = DebtPayment::where('user_id', $userId)
                ->where('debt_id', $debtId)
                ->where('account_id', $accountId)
                ->where('payment_amount', $amount)
                ->whereDate('payment_date', $date)
                ->where('notes', $row['notes'] ?? null)
                ->first();

            $attrs = [
                'debt_id' => $debtId,
                'user_id' => $userId,
                'account_id' => $accountId,
                'payment_amount' => $amount,
                'payment_date' => $date,
                'notes' => $row['notes'] ?? null,
                'payment_method' => $row['payment_method'] ?? 'cash',
            ];

            if (!$existing) {
                DebtPayment::create($attrs);
                $summary['debt_payments']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['debt_payments']['updated']++;
            } else {
                $summary['debt_payments']['skipped']++;
            }
        }

        foreach ($payload['credit_payments'] as $row) {
            $creditId = isset($creditMap[$row['credit_export_key'] ?? '']) ? $creditMap[$row['credit_export_key']] : null;
            $accountId = isset($accountMap[$row['account_export_key'] ?? '']) ? $accountMap[$row['account_export_key']] : null;
            $amount = (float) ($row['payment_amount'] ?? 0);
            $date = (string) ($row['payment_date'] ?? '');

            if (!$creditId || !$accountId || $amount <= 0 || !$date) {
                $summary['credit_payments']['skipped']++;
                continue;
            }

            $existing = CreditPayment::where('user_id', $userId)
                ->where('credit_id', $creditId)
                ->where('account_id', $accountId)
                ->where('payment_amount', $amount)
                ->whereDate('payment_date', $date)
                ->where('notes', $row['notes'] ?? null)
                ->first();

            $attrs = [
                'credit_id' => $creditId,
                'user_id' => $userId,
                'account_id' => $accountId,
                'payment_amount' => $amount,
                'payment_date' => $date,
                'notes' => $row['notes'] ?? null,
                'payment_method' => $row['payment_method'] ?? 'cash',
            ];

            if (!$existing) {
                CreditPayment::create($attrs);
                $summary['credit_payments']['created']++;
                continue;
            }

            if ($this->isIncomingNewer($existing->updated_at, $row['updated_at'] ?? null)) {
                $existing->update($attrs);
                $summary['credit_payments']['updated']++;
            } else {
                $summary['credit_payments']['skipped']++;
            }
        }

        return $summary;
    }

    private function writeLastSnapshot(int $userId, array $snapshot): void
    {
        $path = $this->snapshotPath($userId);
        $dir = dirname($path);
        if (!File::exists($dir)) {
            File::makeDirectory($dir, 0755, true);
        }
        File::put($path, json_encode($snapshot, JSON_PRETTY_PRINT));
    }

    private function snapshotPath(int $userId): string
    {
        return storage_path('app/backup/last-import-user-' . $userId . '.json');
    }

    private function isIncomingNewer($existingUpdatedAt, ?string $incomingUpdatedAt): bool
    {
        if (!$incomingUpdatedAt) {
            return false;
        }

        try {
            $incoming = Carbon::parse($incomingUpdatedAt);
            if (!$existingUpdatedAt) {
                return true;
            }
            return $incoming->gt(Carbon::parse($existingUpdatedAt));
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function accountKey(?string $name, ?string $type, ?string $currency): string
    {
        return strtolower(trim((string) $name)) . '|' . strtolower(trim((string) $type)) . '|' . strtoupper(trim((string) ($currency ?: 'IDR')));
    }

    private function categoryKey(?string $name, ?string $type): string
    {
        return strtolower(trim((string) $name)) . '|' . strtolower(trim((string) $type));
    }

    private function debtKey(?string $creditorName, $totalAmount, $startDate, $dueDate, ?string $description): string
    {
        return implode('|', [
            strtolower(trim((string) $creditorName)),
            number_format((float) $totalAmount, 2, '.', ''),
            (string) $startDate,
            (string) ($dueDate ?? ''),
            strtolower(trim((string) ($description ?? ''))),
        ]);
    }

    private function creditKey(?string $debtorName, $totalAmount, $startDate, $dueDate, ?string $description): string
    {
        return implode('|', [
            strtolower(trim((string) $debtorName)),
            number_format((float) $totalAmount, 2, '.', ''),
            (string) $startDate,
            (string) ($dueDate ?? ''),
            strtolower(trim((string) ($description ?? ''))),
        ]);
    }
}
