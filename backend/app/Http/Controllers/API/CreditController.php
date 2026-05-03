<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Credit;
use App\Models\CreditPayment;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CreditController extends Controller
{
    // List all credits for user
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credits = Credit::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($credit) => $this->transformCredit($credit));

        return response()->json(['success' => true, 'data' => $credits]);
    }

    // Get active credits
    public function getActive(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credits = Credit::where('user_id', $user->user_id)
            ->where('credit_status', 'active')
            ->orderByDesc('due_date')
            ->get()
            ->map(fn ($credit) => $this->transformCredit($credit));

        return response()->json(['success' => true, 'data' => $credits]);
    }

    // Create new credit
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'debtor_name' => 'required|string|max:100',
            'total_amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'due_date' => 'nullable|date',
            'account_id' => 'required|integer',
            'priority' => 'nullable|in:low,medium,high',
            'color_code' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $linkedAccount = null;
            if ($request->filled('account_id')) {
                $linkedAccount = Account::where('user_id', $user->user_id)
                    ->where('account_id', $request->account_id)
                    ->lockForUpdate()
                    ->first();

                if (!$linkedAccount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected account not found',
                    ], 422);
                }
            }

            $credit = Credit::create([
                'user_id' => $user->user_id,
                'debtor_name' => $request->debtor_name,
                'total_amount' => $request->total_amount,
                'received_amount' => 0,
                'remaining_amount' => $request->total_amount,
                'description' => $request->description,
                'start_date' => $request->start_date,
                'due_date' => $request->due_date,
                'account_id' => $request->account_id,
                'priority' => $request->priority ?? 'medium',
                'color_code' => $request->color_code ?? '#27ae60',
                'credit_status' => 'active',
                'progress_percentage' => 0,
            ]);

            // Creating credit means money leaves account first.
            if ($linkedAccount) {
                $creditAmount = (float) $request->total_amount;
                if ($this->willMakeRestrictedAccountNegative($linkedAccount, $creditAmount)) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient balance in selected account',
                    ], 422);
                }

                $linkedAccount->balance = (float) $linkedAccount->balance - $creditAmount;
                $linkedAccount->save();

                $categoryId = $this->getCategoryIdByName('Piutang Diberikan');
                $this->createLedgerTransaction(
                    $user->user_id,
                    $linkedAccount->account_id,
                    'expense',
                    $creditAmount,
                    $request->start_date,
                    'Credit issued to ' . $request->debtor_name,
                    'Auto-created from credit #' . $credit->credit_id,
                    $categoryId
                );
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating credit: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Credit created successfully',
            'data' => $this->transformCredit($credit),
        ], 201);
    }

    // Get single credit
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credit = Credit::where('user_id', $user->user_id)->find($id);
        if (!$credit) {
            return response()->json(['success' => false, 'message' => 'Credit not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->transformCredit($credit),
            'payments' => $credit->payments()->orderByDesc('payment_date')->get(),
        ]);
    }

    // Update credit
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credit = Credit::where('user_id', $user->user_id)->find($id);
        if (!$credit) {
            return response()->json(['success' => false, 'message' => 'Credit not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'debtor_name' => 'nullable|string|max:100',
            'total_amount' => 'nullable|numeric|min:0.01',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'credit_status' => 'nullable|in:active,completed,paused,written_off',
            'account_id' => 'nullable|integer',
            'priority' => 'nullable|in:low,medium,high',
            'color_code' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $credit->update($request->only([
            'debtor_name',
            'description',
            'due_date',
            'credit_status',
            'account_id',
            'priority',
            'color_code',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Credit updated successfully',
            'data' => $this->transformCredit($credit),
        ]);
    }

    // Add payment to credit
    public function addPayment(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credit = Credit::where('user_id', $user->user_id)->find($id);
        if (!$credit) {
            return response()->json(['success' => false, 'message' => 'Credit not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'payment_amount' => 'required|numeric|min:0.01',
            'account_id' => 'required|integer',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $account = Account::where('user_id', $user->user_id)
                ->where('account_id', $request->account_id)
                ->lockForUpdate()
                ->first();

            if (!$account) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Selected account not found',
                ], 422);
            }

            $payment = CreditPayment::create([
                'credit_id' => $credit->credit_id,
                'user_id' => $user->user_id,
                'account_id' => $request->account_id,
                'payment_amount' => $request->payment_amount,
                'payment_date' => $request->payment_date,
                'payment_method' => $request->payment_method ?? 'cash',
                'notes' => $request->notes,
            ]);

            // Update credit with payment
            $credit->received_amount += $request->payment_amount;
            $credit->updateProgress();

            // Receiving payment increases account balance.
            $account->balance = (float) $account->balance + (float) $request->payment_amount;
            $account->save();

            $categoryId = $this->getCategoryIdByName('Pembayaran Piutang');
            $this->createLedgerTransaction(
                $user->user_id,
                $account->account_id,
                'income',
                (float) $request->payment_amount,
                $request->payment_date,
                'Credit payment received from ' . $credit->debtor_name,
                'Auto-created from credit payment #' . $payment->payment_id,
                $categoryId
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment added successfully',
                'data' => $payment,
                'credit' => $this->transformCredit($credit),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error adding payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Delete payment
    public function deletePayment(Request $request, $creditId, $paymentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credit = Credit::where('user_id', $user->user_id)->find($creditId);
        if (!$credit) {
            return response()->json(['success' => false, 'message' => 'Credit not found'], 404);
        }

        $payment = CreditPayment::where('payment_id', $paymentId)
            ->where('credit_id', $creditId)
            ->first();

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        try {
            DB::beginTransaction();

            $paymentAmount = $payment->payment_amount;
            $paymentAccount = Account::where('user_id', $user->user_id)
                ->where('account_id', $payment->account_id)
                ->lockForUpdate()
                ->first();

            if ($paymentAccount && $this->willMakeRestrictedAccountNegative($paymentAccount, (float) $paymentAmount)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance to reverse this payment',
                ], 422);
            }

            $payment->delete();

            // Update credit
            $credit->received_amount -= $paymentAmount;
            $credit->updateProgress();

            // Reverting received payment decreases account balance.
            if ($paymentAccount) {
                $paymentAccount->balance = (float) $paymentAccount->balance - (float) $paymentAmount;
                $paymentAccount->save();

                $categoryId = $this->getCategoryIdByName('Dana Keluar untuk Hutang');
                $this->createLedgerTransaction(
                    $user->user_id,
                    $paymentAccount->account_id,
                    'expense',
                    (float) $paymentAmount,
                    $payment->payment_date,
                    'Credit payment reversal from ' . $credit->debtor_name,
                    'Auto-created from credit payment delete #' . $paymentId,
                    $categoryId
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment deleted successfully',
                'credit' => $this->transformCredit($credit),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Delete credit
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $credit = Credit::where('user_id', $user->user_id)->find($id);
        if (!$credit) {
            return response()->json(['success' => false, 'message' => 'Credit not found'], 404);
        }

        $credit->delete();

        return response()->json([
            'success' => true,
            'message' => 'Credit deleted successfully',
        ]);
    }

    // Transform credit data for response
    private function transformCredit($credit)
    {
        return [
            'credit_id' => $credit->credit_id,
            'debtor_name' => $credit->debtor_name,
            'total_amount' => $credit->total_amount,
            'received_amount' => $credit->received_amount,
            'remaining_amount' => $credit->remaining_amount,
            'progress_percentage' => $credit->progress_percentage,
            'description' => $credit->description,
            'start_date' => $credit->start_date,
            'due_date' => $credit->due_date,
            'credit_status' => $credit->credit_status,
            'account_id' => $credit->account_id,
            'account_name' => $credit->account?->account_name,
            'priority' => $credit->priority,
            'color_code' => $credit->color_code,
            'created_at' => $credit->created_at,
            'updated_at' => $credit->updated_at,
        ];
    }

    private function willMakeRestrictedAccountNegative(Account $account, float $decreaseAmount): bool
    {
        $restrictedTypes = ['cash', 'bank', 'savings'];
        $accountType = strtolower((string) $account->account_type);

        if (!in_array($accountType, $restrictedTypes, true)) {
            return false;
        }

        return ((float) $account->balance - $decreaseAmount) < 0;
    }

    private function getCategoryIdByName(string $categoryName): ?int
    {
        $category = \App\Models\Category::where('category_name', $categoryName)
            ->where('is_system_default', true)
            ->first();
        return $category?->category_id;
    }

    private function createLedgerTransaction(
        int $userId,
        int $accountId,
        string $type,
        float $amount,
        $date,
        string $description,
        string $notes,
        ?int $categoryId = null
    ): void {
        $transactionDate = is_string($date)
            ? $date
            : optional($date)->toDateString();

        Transaction::create([
            'user_id' => $userId,
            'account_id' => $accountId,
            'transaction_type' => $type,
            'amount' => $amount,
            'category_id' => $categoryId,
            'transaction_date' => $transactionDate ?? now()->toDateString(),
            'description' => $description,
            'notes' => $notes,
        ]);
    }
}
