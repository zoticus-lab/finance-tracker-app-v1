<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getSummary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $totalBalance = (float) Account::where('user_id', $user->user_id)->sum('balance');
        $totalIncome = (float) Transaction::where('user_id', $user->user_id)->where('transaction_type', 'income')->sum('amount');
        $totalExpense = (float) Transaction::where('user_id', $user->user_id)->where('transaction_type', 'expense')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total_balance' => $totalBalance,
                'total_income' => $totalIncome,
                'total_expense' => $totalExpense,
                'net' => $totalIncome - $totalExpense,
            ],
        ]);
    }

    public function getCashFlow(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $rows = Transaction::select(
                DB::raw('DATE_FORMAT(transaction_date, "%Y-%m") as period'),
                DB::raw('SUM(CASE WHEN transaction_type = "income" THEN amount ELSE 0 END) as income'),
                DB::raw('SUM(CASE WHEN transaction_type = "expense" THEN amount ELSE 0 END) as expense')
            )
            ->where('user_id', $user->user_id)
            ->groupBy('period')
            ->orderBy('period', 'asc')
            ->limit(12)
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function getExpenseBreakdown(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $rows = Transaction::select('categories.category_name as category_name', DB::raw('SUM(transactions.amount) as amount'))
            ->leftJoin('categories', 'categories.category_id', '=', 'transactions.category_id')
            ->where('transactions.user_id', $user->user_id)
            ->where('transactions.transaction_type', 'expense')
            ->groupBy('categories.category_name')
            ->orderByDesc('amount')
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function getBalanceTrend(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $rows = Transaction::select('transaction_date', DB::raw('SUM(CASE WHEN transaction_type = "income" THEN amount ELSE -amount END) as net_change'))
            ->where('user_id', $user->user_id)
            ->groupBy('transaction_date')
            ->orderBy('transaction_date', 'asc')
            ->limit(90)
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function getTopCategories(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $rows = Transaction::select('categories.category_name as category_name', DB::raw('SUM(transactions.amount) as amount'))
            ->leftJoin('categories', 'categories.category_id', '=', 'transactions.category_id')
            ->where('transactions.user_id', $user->user_id)
            ->where('transactions.transaction_type', 'expense')
            ->groupBy('categories.category_name')
            ->orderByDesc('amount')
            ->limit(5)
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }
}
