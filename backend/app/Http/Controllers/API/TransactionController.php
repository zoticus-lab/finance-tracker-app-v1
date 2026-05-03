<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Account;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $query = Transaction::where('user_id', $user->user_id);

        if ($request->filled('type')) {
            $query->where('transaction_type', $request->type);
        }
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $transactions = $query
            ->with(['account:account_id,account_name', 'category:category_id,category_name'])
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn ($t) => $this->transformTransaction($t));

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    public function storeIncome(Request $request)
    {
        return $this->storeByType($request, 'income');
    }

    public function storeExpense(Request $request)
    {
        return $this->storeByType($request, 'expense');
    }

    public function storeTransfer(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'from_account_id' => 'required|integer',
            'to_account_id' => 'required|integer|different:from_account_id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'nullable|date',
            'description' => 'nullable|string|max:255',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $amount = (float) $request->amount;
            $fromAccount = $this->findUserAccountForUpdate($user->user_id, (int) $request->from_account_id);
            $toAccount = $this->findUserAccountForUpdate($user->user_id, (int) $request->to_account_id);

            if (!$fromAccount || !$toAccount) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Invalid account'], 422);
            }

            if ($this->willMakeRestrictedAccountNegative($fromAccount, $amount)) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Insufficient balance in source account'], 422);
            }

            $transaction = Transaction::create([
                'user_id' => $user->user_id,
                'account_id' => $request->from_account_id,
                'transaction_type' => 'transfer',
                'amount' => $amount,
                'transaction_date' => $request->date ?? now()->toDateString(),
                'description' => $request->description,
                'notes' => $request->note,
            ]);

            if (DB::getSchemaBuilder()->hasTable('transfers')) {
                DB::table('transfers')->insert([
                    'transaction_id' => $transaction->transaction_id,
                    'from_account_id' => $request->from_account_id,
                    'to_account_id' => $request->to_account_id,
                    'amount' => $request->amount,
                    'description' => $request->description,
                    'created_at' => now(),
                ]);
            }

            $fromAccount->balance = (float) $fromAccount->balance - $amount;
            $toAccount->balance = (float) $toAccount->balance + $amount;
            $fromAccount->save();
            $toAccount->save();

            $transaction->load(['account:account_id,account_name', 'category:category_id,category_name']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transfer saved successfully',
                'data' => $this->transformTransaction($transaction),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to save transfer: '.$e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $transaction = Transaction::where('transaction_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$transaction) {
            return response()->json(['success' => false, 'message' => 'Transaction not found'], 404);
        }

        DB::beginTransaction();
        try {
            $amount = (float) $transaction->amount;

            if ($transaction->transaction_type === 'income') {
                $account = $this->findUserAccountForUpdate($user->user_id, (int) $transaction->account_id);
                if ($account && $this->willMakeRestrictedAccountNegative($account, $amount)) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Insufficient balance to delete this income transaction'], 422);
                }
                if ($account) {
                    $account->balance = (float) $account->balance - $amount;
                    $account->save();
                }
            } elseif ($transaction->transaction_type === 'expense') {
                $account = $this->findUserAccountForUpdate($user->user_id, (int) $transaction->account_id);
                if ($account) {
                    $account->balance = (float) $account->balance + $amount;
                    $account->save();
                }
            } elseif ($transaction->transaction_type === 'transfer' && DB::getSchemaBuilder()->hasTable('transfers')) {
                $transfer = DB::table('transfers')->where('transaction_id', $transaction->transaction_id)->first();
                if ($transfer) {
                    $fromAccount = $this->findUserAccountForUpdate($user->user_id, (int) $transfer->from_account_id);
                    $toAccount = $this->findUserAccountForUpdate($user->user_id, (int) $transfer->to_account_id);
                    $transferAmount = (float) $transfer->amount;

                    if ($toAccount && $this->willMakeRestrictedAccountNegative($toAccount, $transferAmount)) {
                        DB::rollBack();
                        return response()->json(['success' => false, 'message' => 'Insufficient balance to delete this transfer'], 422);
                    }

                    if ($fromAccount) {
                        $fromAccount->balance = (float) $fromAccount->balance + $transferAmount;
                        $fromAccount->save();
                    }
                    if ($toAccount) {
                        $toAccount->balance = (float) $toAccount->balance - $transferAmount;
                        $toAccount->save();
                    }

                    DB::table('transfers')->where('transaction_id', $transaction->transaction_id)->delete();
                }
            }

            $transaction->delete();
            DB::commit();

            return response()->json(['success' => true, 'message' => 'Transaction deleted successfully']);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to delete transaction: '.$e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $transaction = Transaction::where('transaction_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$transaction) {
            return response()->json(['success' => false, 'message' => 'Transaction not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'account_id' => 'sometimes|required|integer',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'category_id' => 'nullable|integer',
            'date' => 'sometimes|required|date',
            'description' => 'nullable|string|max:255',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        if ($request->filled('account_id')) {
            $account = Account::where('account_id', $request->account_id)
                ->where('user_id', $user->user_id)
                ->first();

            if (!$account) {
                return response()->json(['success' => false, 'message' => 'Invalid account'], 422);
            }
        }

        if (!is_null($request->category_id)) {
            $category = Category::where('category_id', $request->category_id)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->user_id)
                        ->orWhere('is_system_default', true);
                })
                ->first();

            if (!$category) {
                return response()->json(['success' => false, 'message' => 'Invalid category'], 422);
            }
        }

        DB::beginTransaction();
        try {
            $oldAccount = $this->findUserAccountForUpdate($user->user_id, (int) $transaction->account_id);
            $newAccountId = (int) ($request->has('account_id') ? $request->account_id : $transaction->account_id);
            $newAmount = (float) ($request->has('amount') ? $request->amount : $transaction->amount);
            $oldAmount = (float) $transaction->amount;

            $newAccount = $oldAccount;
            if ($newAccountId !== (int) $transaction->account_id) {
                $newAccount = $this->findUserAccountForUpdate($user->user_id, $newAccountId);
            }

            if (!$newAccount) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Invalid account'], 422);
            }

            if ($transaction->transaction_type === 'income') {
                if ($oldAccount && $this->willMakeRestrictedAccountNegative($oldAccount, $oldAmount)) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Insufficient balance to update this income transaction'], 422);
                }

                if ($oldAccount) {
                    $oldAccount->balance = (float) $oldAccount->balance - $oldAmount;
                    $oldAccount->save();
                }

                $newAccount->balance = (float) $newAccount->balance + $newAmount;
                $newAccount->save();
            } elseif ($transaction->transaction_type === 'expense') {
                if ($oldAccount) {
                    $oldAccount->balance = (float) $oldAccount->balance + $oldAmount;
                    $oldAccount->save();
                }

                if ($this->willMakeRestrictedAccountNegative($newAccount, $newAmount)) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Insufficient balance in selected account'], 422);
                }

                $newAccount->balance = (float) $newAccount->balance - $newAmount;
                $newAccount->save();
            } else {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Transfer update is not supported yet'], 422);
            }

            $transaction->update([
                'account_id' => $newAccountId,
                'amount' => $newAmount,
                'category_id' => $request->has('category_id') ? $request->category_id : $transaction->category_id,
                'transaction_date' => $request->has('date') ? $request->date : $transaction->transaction_date,
                'description' => $request->has('description') ? $request->description : $transaction->description,
                'notes' => $request->has('note') ? $request->note : $transaction->notes,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to update transaction: '.$e->getMessage()], 500);
        }

        $transaction->load(['account:account_id,account_name', 'category:category_id,category_name']);

        return response()->json([
            'success' => true,
            'message' => 'Transaction updated successfully',
            'data' => $this->transformTransaction($transaction),
        ]);
    }

    private function storeByType(Request $request, string $type)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'account_id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'category_id' => 'nullable|integer',
            'date' => 'nullable|date',
            'description' => 'nullable|string|max:255',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $amount = (float) $request->amount;
            $account = $this->findUserAccountForUpdate($user->user_id, (int) $request->account_id);

            if (!$account) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Invalid account'], 422);
            }

            if ($type === 'expense' && $this->willMakeRestrictedAccountNegative($account, $amount)) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Insufficient balance in selected account'], 422);
            }

            $transaction = Transaction::create([
                'user_id' => $user->user_id,
                'account_id' => $request->account_id,
                'transaction_type' => $type,
                'amount' => $amount,
                'category_id' => $request->category_id,
                'transaction_date' => $request->date ?? now()->toDateString(),
                'description' => $request->description,
                'notes' => $request->note,
            ]);

            $delta = $type === 'income' ? $amount : -$amount;
            $account->balance = (float) $account->balance + $delta;
            $account->save();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to save transaction: '.$e->getMessage()], 500);
        }

        $transaction->load(['account:account_id,account_name', 'category:category_id,category_name']);

        return response()->json([
            'success' => true,
            'message' => ucfirst($type).' saved successfully',
            'data' => $this->transformTransaction($transaction),
        ], 201);
    }

    private function findUserAccountForUpdate(int $userId, int $accountId): ?Account
    {
        return Account::where('user_id', $userId)
            ->where('account_id', $accountId)
            ->lockForUpdate()
            ->first();
    }

    private function willMakeRestrictedAccountNegative(Account $account, float $decreaseAmount): bool
    {
        $restrictedTypes = ['cash', 'bank', 'savings'];
        $type = strtolower((string) $account->account_type);

        if (!in_array($type, $restrictedTypes, true)) {
            return false;
        }

        return ((float) $account->balance - $decreaseAmount) < 0;
    }

    private function transformTransaction(Transaction $t): array
    {
        return [
            'id' => $t->transaction_id,
            'type' => $t->transaction_type,
            'amount' => (float) $t->amount,
            'account_id' => $t->account_id,
            'category_id' => $t->category_id,
            'date' => (string) $t->transaction_date,
            'description' => $t->description,
            'note' => $t->notes,
            'created_at' => (string) $t->created_at,
            'account' => $t->account ? [
                'id' => $t->account->account_id,
                'name' => $t->account->account_name,
            ] : null,
            'category' => $t->category ? [
                'id' => $t->category->category_id,
                'name' => $t->category->category_name,
            ] : null,
        ];
    }
}
