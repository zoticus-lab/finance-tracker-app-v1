<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $budgets = Budget::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->budget_id,
                'name' => $b->budget_name,
                'category_id' => $b->category_id,
                'limit_amount' => (float) $b->budget_limit,
                'spent_amount' => (float) $b->spent_amount,
                'period_type' => $b->period_type,
                'period_start' => (string) $b->period_start_date,
                'period_end' => (string) $b->period_end_date,
                'is_active' => (bool) $b->is_active,
            ]);

        return response()->json(['success' => true, 'data' => $budgets]);
    }

    public function getCurrentMonth(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $today = now()->toDateString();
        $budgets = Budget::where('user_id', $user->user_id)
            ->where('period_start_date', '<=', $today)
            ->where('period_end_date', '>=', $today)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->budget_id,
                'name' => $b->budget_name,
                'limit_amount' => (float) $b->budget_limit,
                'spent_amount' => (float) $b->spent_amount,
            ]);

        return response()->json(['success' => true, 'data' => $budgets]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'limit_amount' => 'required|numeric|min:0.01',
            'period_type' => 'required|in:daily,weekly,monthly,yearly',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $budget = Budget::create([
            'user_id' => $user->user_id,
            'category_id' => $request->category_id,
            'budget_name' => $request->name,
            'budget_limit' => $request->limit_amount,
            'period_type' => $request->period_type,
            'period_start_date' => $request->period_start,
            'period_end_date' => $request->period_end,
            'spent_amount' => 0,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Budget created successfully',
            'data' => [
                'id' => $budget->budget_id,
                'name' => $budget->budget_name,
                'category_id' => $budget->category_id,
                'limit_amount' => (float) $budget->budget_limit,
                'spent_amount' => (float) $budget->spent_amount,
                'period_type' => $budget->period_type,
                'period_start' => (string) $budget->period_start_date,
                'period_end' => (string) $budget->period_end_date,
            ],
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $budget = Budget::where('budget_id', $id)->where('user_id', $user->user_id)->first();
        if (!$budget) {
            return response()->json(['success' => false, 'message' => 'Budget not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $budget->budget_id,
                'name' => $budget->budget_name,
                'category_id' => $budget->category_id,
                'limit_amount' => (float) $budget->budget_limit,
                'spent_amount' => (float) $budget->spent_amount,
                'period_type' => $budget->period_type,
                'period_start' => (string) $budget->period_start_date,
                'period_end' => (string) $budget->period_end_date,
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $budget = Budget::where('budget_id', $id)->where('user_id', $user->user_id)->first();
        if (!$budget) {
            return response()->json(['success' => false, 'message' => 'Budget not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'limit_amount' => 'sometimes|required|numeric|min:0.01',
            'period_type' => 'sometimes|required|in:daily,weekly,monthly,yearly',
            'period_start' => 'sometimes|required|date',
            'period_end' => 'sometimes|required|date',
            'spent_amount' => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $budget->update([
            'budget_name' => $request->name ?? $budget->budget_name,
            'category_id' => $request->has('category_id') ? $request->category_id : $budget->category_id,
            'budget_limit' => $request->limit_amount ?? $budget->budget_limit,
            'period_type' => $request->period_type ?? $budget->period_type,
            'period_start_date' => $request->period_start ?? $budget->period_start_date,
            'period_end_date' => $request->period_end ?? $budget->period_end_date,
            'spent_amount' => $request->spent_amount ?? $budget->spent_amount,
        ]);

        return response()->json(['success' => true, 'message' => 'Budget updated successfully']);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $budget = Budget::where('budget_id', $id)->where('user_id', $user->user_id)->first();
        if (!$budget) {
            return response()->json(['success' => false, 'message' => 'Budget not found'], 404);
        }

        $budget->delete();
        return response()->json(['success' => true, 'message' => 'Budget deleted successfully']);
    }
}
