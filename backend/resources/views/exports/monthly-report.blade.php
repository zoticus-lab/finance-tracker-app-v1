<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Financial Report - {{ $summary['month_name'] }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 5px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .summary {
            background-color: #ecf0f1;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 5px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .summary-item {
            background: white;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
        }
        
        .summary-item.income {
            border-left-color: #27ae60;
        }
        
        .summary-item.expense {
            border-left-color: #e74c3c;
        }
        
        .summary-item.net {
            border-left-color: #f39c12;
        }
        
        .summary-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .summary-value.negative {
            color: #e74c3c;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        table thead {
            background-color: #34495e;
            color: white;
        }
        
        table th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        
        table td {
            padding: 10px 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        table tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        table tbody tr:hover {
            background-color: #ecf0f1;
        }
        
        .type-income {
            color: #27ae60;
            font-weight: bold;
        }
        
        .type-expense {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .type-transfer {
            color: #3498db;
            font-weight: bold;
        }
        
        .amount {
            text-align: right;
            font-weight: 500;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
        }
        
        .generated-date {
            margin-top: 10px;
            font-size: 11px;
        }
        
        @media print {
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Report</h1>
        <p>{{ $summary['month_name'] }}</p>
    </div>

    <div class="summary">
        <h2>Monthly Summary</h2>
        <div class="summary-grid">
            <div class="summary-item income">
                <div class="summary-label">Total Income</div>
                <div class="summary-value">Rp {{ number_format($summary['total_income'], 0, ',', '.') }}</div>
            </div>
            <div class="summary-item expense">
                <div class="summary-label">Total Expense</div>
                <div class="summary-value">Rp {{ number_format($summary['total_expense'], 0, ',', '.') }}</div>
            </div>
            <div class="summary-item net">
                <div class="summary-label">Net Cash Flow</div>
                <div class="summary-value @if($summary['net'] < 0) negative @endif">
                    Rp {{ number_format($summary['net'], 0, ',', '.') }}
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Transactions</div>
                <div class="summary-value">{{ $summary['transaction_count'] }}</div>
            </div>
        </div>
    </div>

    <h2 style="margin-bottom: 15px; font-size: 18px;">Transaction Details</h2>
    
    @if($transactions->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($transactions as $transaction)
                    <tr>
                        <td>{{ $transaction->transaction_date }}</td>
                        <td>
                            <span class="type-{{ $transaction->transaction_type }}">
                                {{ ucfirst($transaction->transaction_type) }}
                            </span>
                        </td>
                        <td>{{ $transaction->description ?? '-' }}</td>
                        <td>{{ $transaction->category?->category_name ?? 'N/A' }}</td>
                        <td>{{ $transaction->account?->account_name ?? 'N/A' }}</td>
                        <td class="amount">
                            @if($transaction->transaction_type === 'income')
                                + Rp {{ number_format($transaction->amount, 0, ',', '.') }}
                            @else
                                - Rp {{ number_format($transaction->amount, 0, ',', '.') }}
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
            <p>No transactions found for {{ $summary['month_name'] }}</p>
        </div>
    @endif

    <div class="footer">
        <p>This report was automatically generated by Finance Tracker App</p>
        <div class="generated-date">Generated on: {{ now()->format('d F Y H:i:s') }}</div>
    </div>
</body>
</html>
