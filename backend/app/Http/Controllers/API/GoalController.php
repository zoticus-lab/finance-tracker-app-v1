<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Goal;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class GoalController extends Controller
{
    public function uploadImage(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'required|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('image');
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $filename = 'goal_' . $user->user_id . '_' . Str::uuid() . '.' . $extension;

        $destination = public_path('uploads/goals');
        if (!is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);

        $relativePath = '/uploads/goals/' . $filename;

        return response()->json([
            'success' => true,
            'message' => 'Image uploaded successfully',
            'data' => [
                'image_url' => url($relativePath),
                'image_path' => $relativePath,
            ],
        ], 201);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $goals = Goal::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($goal) => $this->transformGoal($goal));

        return response()->json(['success' => true, 'data' => $goals]);
    }

    public function getActive(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $goals = Goal::where('user_id', $user->user_id)
            ->where('goal_status', 'active')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($goal) => $this->transformGoal($goal));

        return response()->json(['success' => true, 'data' => $goals]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'target_amount' => 'required|numeric|min:0.01',
            'current_amount' => 'nullable|numeric|min:0',
            'target_date' => 'nullable|date',
            'account_id' => 'nullable|integer',
            'goal_category' => 'nullable|string|max:50',
            'image_url' => 'nullable|string|max:300000',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,medium,high',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $goal = Goal::create([
            'user_id' => $user->user_id,
            'account_id' => $request->account_id,
            'goal_name' => $request->name,
            'target_amount' => $request->target_amount,
            'current_amount' => $request->current_amount ?? 0,
            'target_date' => $request->target_date,
            'goal_status' => 'active',
            'goal_category' => $request->goal_category,
            'icon' => $request->image_url,
            'description' => $request->description,
            'priority' => $request->priority ?? 'medium',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Goal created successfully',
            'data' => $this->transformGoal($goal),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $goal = $this->findUserGoal($request, $id);
        if (!$goal) {
            return response()->json(['success' => false, 'message' => 'Goal not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->transformGoal($goal)]);
    }

    public function update(Request $request, $id)
    {
        $goal = $this->findUserGoal($request, $id);
        if (!$goal) {
            return response()->json(['success' => false, 'message' => 'Goal not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'target_amount' => 'sometimes|required|numeric|min:0.01',
            'current_amount' => 'sometimes|numeric|min:0',
            'target_date' => 'nullable|date',
            'account_id' => 'nullable|integer',
            'goal_status' => 'sometimes|in:active,completed,abandoned,paused',
            'goal_category' => 'nullable|string|max:50',
            'image_url' => 'nullable|string|max:300000',
            'description' => 'nullable|string',
            'priority' => 'sometimes|in:low,medium,high',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $goal->update([
            'goal_name' => $request->name ?? $goal->goal_name,
            'target_amount' => $request->target_amount ?? $goal->target_amount,
            'current_amount' => $request->current_amount ?? $goal->current_amount,
            'target_date' => $request->target_date ?? $goal->target_date,
            'account_id' => $request->account_id ?? $goal->account_id,
            'goal_status' => $request->goal_status ?? $goal->goal_status,
            'goal_category' => $request->goal_category ?? $goal->goal_category,
            'icon' => $request->has('image_url') ? $request->image_url : $goal->icon,
            'description' => $request->description ?? $goal->description,
            'priority' => $request->priority ?? $goal->priority,
            'completed_at' => ($request->goal_status ?? $goal->goal_status) === 'completed'
                ? ($goal->completed_at ?? now())
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Goal updated successfully',
            'data' => $this->transformGoal($goal),
        ]);
    }

    public function updateProgress(Request $request, $id)
    {
        $goal = $this->findUserGoal($request, $id);
        if (!$goal) {
            return response()->json(['success' => false, 'message' => 'Goal not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'current_amount' => 'required|numeric|min:0',
            'account_id' => 'nullable|integer',
            'movement_amount' => 'nullable|numeric|min:0.01',
            'movement_type' => 'nullable|in:deposit,withdraw',
            'movement_date' => 'nullable|date',
            'movement_note' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $hasMovement = $request->filled('movement_amount') || $request->filled('account_id') || $request->filled('movement_type');
        $movementTransaction = null;
        $updatedAccount = null;

        try {
            DB::beginTransaction();

            $newAmount = (float) $request->current_amount;

            if ($hasMovement) {
                if (!$request->filled('movement_amount') || !$request->filled('account_id') || !$request->filled('movement_type')) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'account_id, movement_amount, and movement_type are required for fund movement',
                    ], 422);
                }

                $movementAmount = (float) $request->movement_amount;
                $movementType = (string) $request->movement_type;

                $account = Account::where('user_id', $user->user_id)
                    ->where('account_id', (int) $request->account_id)
                    ->lockForUpdate()
                    ->first();

                if (!$account) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected account not found',
                    ], 422);
                }

                if ($movementType === 'deposit') {
                    if ($this->willMakeRestrictedAccountNegative($account, $movementAmount)) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Insufficient balance in selected account',
                        ], 422);
                    }

                    $newAmount = (float) $goal->current_amount + $movementAmount;
                    $account->balance = (float) $account->balance - $movementAmount;
                } else {
                    $newAmount = max((float) $goal->current_amount - $movementAmount, 0);
                    $account->balance = (float) $account->balance + $movementAmount;
                }

                $account->save();
                $updatedAccount = $account;

                $movementTransaction = Transaction::create([
                    'user_id' => $user->user_id,
                    'account_id' => $account->account_id,
                    'transaction_type' => $movementType === 'deposit' ? 'expense' : 'income',
                    'amount' => $movementAmount,
                    'category_id' => null,
                    'transaction_date' => $request->movement_date ?? now()->toDateString(),
                    'description' => $movementType === 'deposit'
                        ? 'Setoran goal: ' . $goal->goal_name
                        : 'Penarikan goal: ' . $goal->goal_name,
                    'notes' => $request->movement_note
                        ?? ($movementType === 'deposit'
                            ? 'Auto-created from goal deposit #' . $goal->goal_id
                            : 'Auto-created from goal withdrawal #' . $goal->goal_id),
                ]);

                $movementTransaction->load(['account:account_id,account_name', 'category:category_id,category_name']);
            }

            $status = $newAmount >= (float) $goal->target_amount ? 'completed' : 'active';

            $goal->update([
                'current_amount' => $newAmount,
                'goal_status' => $status,
                'account_id' => $request->account_id ?? $goal->account_id,
                'completed_at' => $status === 'completed' ? ($goal->completed_at ?? now()) : null,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update goal progress: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Goal progress updated',
            'data' => $this->transformGoal($goal),
            'transaction' => $movementTransaction ? $this->transformTransaction($movementTransaction) : null,
            'account' => $updatedAccount ? [
                'id' => $updatedAccount->account_id,
                'name' => $updatedAccount->account_name,
                'balance' => (float) $updatedAccount->balance,
            ] : null,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $goal = $this->findUserGoal($request, $id);
        if (!$goal) {
            return response()->json(['success' => false, 'message' => 'Goal not found'], 404);
        }

        $goal->delete();
        return response()->json(['success' => true, 'message' => 'Goal deleted successfully']);
    }

    private function findUserGoal(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return null;
        }

        return Goal::where('user_id', $user->user_id)
            ->where('goal_id', $id)
            ->first();
    }

    private function transformGoal(Goal $goal): array
    {
        return [
            'id' => $goal->goal_id,
            'name' => $goal->goal_name,
            'account_id' => $goal->account_id,
            'target_amount' => (float) $goal->target_amount,
            'current_amount' => (float) $goal->current_amount,
            'target_date' => $goal->target_date,
            'status' => $goal->goal_status,
            'goal_category' => $goal->goal_category,
            'image_url' => $goal->icon,
            'description' => $goal->description,
            'priority' => $goal->priority,
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
