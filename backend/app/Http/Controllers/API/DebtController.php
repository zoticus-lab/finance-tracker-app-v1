<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class DebtController extends Controller
{
    // List all debts for user
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debts = Debt::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($debt) => $this->transformDebt($debt));

        return response()->json(['success' => true, 'data' => $debts]);
    }

    // Get active debts
    public function getActive(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debts = Debt::where('user_id', $user->user_id)
            ->where('debt_status', 'active')
            ->orderByDesc('due_date')
            ->get()
            ->map(fn ($debt) => $this->transformDebt($debt));

        return response()->json(['success' => true, 'data' => $debts]);
    }

    // Create new debt
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'creditor_name' => 'required|string|max:100',
            'total_amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'due_date' => 'nullable|date',
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

            $debt = Debt::create([
                'user_id' => $user->user_id,
                'creditor_name' => $request->creditor_name,
                'total_amount' => $request->total_amount,
                'paid_amount' => 0,
                'remaining_amount' => $request->total_amount,
                'description' => $request->description,
                'start_date' => $request->start_date,
                'due_date' => $request->due_date,
                'account_id' => $request->account_id,
                'priority' => $request->priority ?? 'medium',
                'color_code' => $request->color_code ?? '#e74c3c',
                'debt_status' => 'active',
                'progress_percentage' => 0,
            ]);

            // Creating debt means user receives money now.
            if ($linkedAccount) {
                $linkedAccount->balance = (float) $linkedAccount->balance + (float) $request->total_amount;
                $linkedAccount->save();

                $categoryId = $this->getCategoryIdByName('Dana Masuk dari Hutang');
                $this->createLedgerTransaction(
                    $user->user_id,
                    $linkedAccount->account_id,
                    'income',
                    (float) $request->total_amount,
                    $request->start_date,
                    'Debt disbursement from ' . $request->creditor_name,
                    'Auto-created from debt #' . $debt->debt_id,
                    $categoryId
                );
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating debt: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Debt created successfully',
            'data' => $this->transformDebt($debt),
        ], 201);
    }

    // Get single debt
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debt = Debt::where('user_id', $user->user_id)->find($id);
        if (!$debt) {
            return response()->json(['success' => false, 'message' => 'Debt not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->transformDebt($debt),
            'payments' => $debt->payments()->orderByDesc('payment_date')->get(),
        ]);
    }

    // Update debt
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debt = Debt::where('user_id', $user->user_id)->find($id);
        if (!$debt) {
            return response()->json(['success' => false, 'message' => 'Debt not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'creditor_name' => 'nullable|string|max:100',
            'total_amount' => 'nullable|numeric|min:0.01',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'debt_status' => 'nullable|in:active,completed,paused,defaulted',
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

        $debt->update($request->only([
            'creditor_name',
            'description',
            'due_date',
            'debt_status',
            'account_id',
            'priority',
            'color_code',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Debt updated successfully',
            'data' => $this->transformDebt($debt),
        ]);
    }

    // Add payment to debt
    public function addPayment(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debt = Debt::where('user_id', $user->user_id)->find($id);
        if (!$debt) {
            return response()->json(['success' => false, 'message' => 'Debt not found'], 404);
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

            $paymentAmount = (float) $request->payment_amount;
            if ($this->willMakeRestrictedAccountNegative($account, $paymentAmount)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance in selected account',
                ], 422);
            }

            $payment = DebtPayment::create([
                'debt_id' => $debt->debt_id,
                'user_id' => $user->user_id,
                'account_id' => $request->account_id,
                'payment_amount' => $request->payment_amount,
                'payment_date' => $request->payment_date,
                'payment_method' => $request->payment_method ?? 'cash',
                'notes' => $request->notes,
            ]);

            // Update debt with payment
            $debt->paid_amount += $request->payment_amount;
            $debt->updateProgress();

            // Paying debt decreases account balance.
            $account->balance = (float) $account->balance - $paymentAmount;
            $account->save();

            $categoryId = $this->getCategoryIdByName('Dana Keluar untuk Hutang');
            $this->createLedgerTransaction(
                $user->user_id,
                $account->account_id,
                'expense',
                $paymentAmount,
                $request->payment_date,
                'Debt payment to ' . $debt->creditor_name,
                'Auto-created from debt payment #' . $payment->payment_id,
                $categoryId
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment added successfully',
                'data' => $payment,
                'debt' => $this->transformDebt($debt),
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
    public function deletePayment(Request $request, $debtId, $paymentId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debt = Debt::where('user_id', $user->user_id)->find($debtId);
        if (!$debt) {
            return response()->json(['success' => false, 'message' => 'Debt not found'], 404);
        }

        $payment = DebtPayment::where('payment_id', $paymentId)
            ->where('debt_id', $debtId)
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

            $payment->delete();

            // Update debt
            $debt->paid_amount -= $paymentAmount;
            $debt->updateProgress();

            // Reverting debt payment adds money back to account.
            if ($paymentAccount) {
                $paymentAccount->balance = (float) $paymentAccount->balance + (float) $paymentAmount;
                $paymentAccount->save();

                $categoryId = $this->getCategoryIdByName('Dana Masuk dari Hutang');
                $this->createLedgerTransaction(
                    $user->user_id,
                    $paymentAccount->account_id,
                    'income',
                    (float) $paymentAmount,
                    $payment->payment_date,
                    'Debt payment reversal from ' . $debt->creditor_name,
                    'Auto-created from debt payment delete #' . $paymentId,
                    $categoryId
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment deleted successfully',
                'debt' => $this->transformDebt($debt),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Delete debt
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $debt = Debt::where('user_id', $user->user_id)->find($id);
        if (!$debt) {
            return response()->json(['success' => false, 'message' => 'Debt not found'], 404);
        }

        $debt->delete();

        return response()->json([
            'success' => true,
            'message' => 'Debt deleted successfully',
        ]);
    }

    // Transform debt data for response
    private function transformDebt($debt)
    {
        return [
            'debt_id' => $debt->debt_id,
            'creditor_name' => $debt->creditor_name,
            'total_amount' => $debt->total_amount,
            'paid_amount' => $debt->paid_amount,
            'remaining_amount' => $debt->remaining_amount,
            'progress_percentage' => $debt->progress_percentage,
            'description' => $debt->description,
            'start_date' => $debt->start_date,
            'due_date' => $debt->due_date,
            'debt_status' => $debt->debt_status,
            'account_id' => $debt->account_id,
            'account_name' => $debt->account?->account_name,
            'priority' => $debt->priority,
            'color_code' => $debt->color_code,
            'created_at' => $debt->created_at,
            'updated_at' => $debt->updated_at,
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
