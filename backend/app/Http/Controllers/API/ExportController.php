<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ExportController extends Controller
{
    /**
     * Export transactions for a specific month
     */
    public function exportMonthly(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);
        $format = $request->query('format', 'json'); // json, csv, pdf

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Get transactions for the month
        $transactions = Transaction::where('user_id', $user->user_id)
            ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['account:account_id,account_name', 'category:category_id,category_name'])
            ->orderByDesc('transaction_date')
            ->get();

        // Calculate summary
        $summary = [
            'month' => $month,
            'year' => $year,
            'month_name' => $startDate->format('F Y'),
            'total_income' => $transactions->where('transaction_type', 'income')->sum('amount'),
            'total_expense' => $transactions->where('transaction_type', 'expense')->sum('amount'),
            'total_transfer' => $transactions->where('transaction_type', 'transfer')->sum('amount'),
            'transaction_count' => $transactions->count(),
        ];

        // Calculate net (income - expense)
        $summary['net'] = $summary['total_income'] - $summary['total_expense'];

        if ($format === 'json') {
            return response()->json([
                'success' => true,
                'summary' => $summary,
                'transactions' => $transactions->map(fn($t) => [
                    'date' => $t->transaction_date,
                    'type' => $t->transaction_type,
                    'description' => $t->description,
                    'category' => $t->category?->category_name ?? 'N/A',
                    'account' => $t->account?->account_name ?? 'N/A',
                    'amount' => $t->amount,
                    'notes' => $t->notes,
                ]),
            ]);
        } elseif ($format === 'csv') {
            return $this->exportCSV($summary, $transactions);
        } elseif ($format === 'pdf') {
            return $this->exportPDF($summary, $transactions);
        }

        return response()->json(['success' => false, 'message' => 'Invalid format'], 400);
    }

    /**
     * Export as CSV (CLI Style)
     */
    private function exportCSV($summary, $transactions)
    {
        $csv = "FINANCIAL REPORT - {$summary['month_name']}\n";
        $csv .= "================================\n\n";
        
        $csv .= "SUMMARY:\n";
        $csv .= "Total Income,Total Expense,Total Transfer,Net\n";
        $csv .= "{$summary['total_income']},{$summary['total_expense']},{$summary['total_transfer']},{$summary['net']}\n\n";
        
        $csv .= "TRANSACTIONS:\n";
        $csv .= "Date,Type,Description,Category,Account,Amount,Notes\n";
        
        foreach ($transactions as $t) {
            $csv .= "{$t->transaction_date},";
            $csv .= "{$t->transaction_type},";
            $csv .= "\"{$t->description}\",";
            $csv .= "{$t->category?->category_name ?? 'N/A'},";
            $csv .= "{$t->account?->account_name ?? 'N/A'},";
            $csv .= "{$t->amount},";
            $csv .= "\"{$t->notes}\"\n";
        }

        $fileName = "financial_report_{$summary['year']}_{$summary['month']}.csv";
        
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"$fileName\"");
    }

    /**
     * Export as PDF (using DOMPDF library)
     */
    private function exportPDF($summary, $transactions)
    {
        try {
            // Check if DomPDF is installed
            if (!class_exists('Barryvdh\DomPDF\Facade\Pdf')) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF export library not installed. Please use CSV or JSON format instead.'
                ], 400);
            }

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.monthly-report', [
                'summary' => $summary,
                'transactions' => $transactions,
            ]);

            $fileName = "financial_report_{$summary['year']}_{$summary['month']}.pdf";
            
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get summary data without export (untuk dashboard)
     */
    public function getMonthlySummary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $transactions = Transaction::where('user_id', $user->user_id)
            ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        $summary = [
            'month' => $month,
            'year' => $year,
            'month_name' => $startDate->format('F Y'),
            'total_income' => $transactions->where('transaction_type', 'income')->sum('amount'),
            'total_expense' => $transactions->where('transaction_type', 'expense')->sum('amount'),
            'total_transfer' => $transactions->where('transaction_type', 'transfer')->sum('amount'),
            'net' => $transactions->where('transaction_type', 'income')->sum('amount') - 
                     $transactions->where('transaction_type', 'expense')->sum('amount'),
            'transaction_count' => $transactions->count(),
        ];

        return response()->json(['success' => true, 'data' => $summary]);
    }
}
