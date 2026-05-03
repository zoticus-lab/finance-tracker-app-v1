<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=== ANALISIS SELISIH UANG ===\n\n";

$user = User::first();
if (!$user) {
    echo "Tidak ada user.\n";
    exit(1);
}

$userId = $user->user_id;
echo "User ID: {$userId} | Email: {$user->email}\n\n";

$accounts = Account::where('user_id', $userId)->get();
$transactions = Transaction::where('user_id', $userId)->get();

$totalBalance = (float) $accounts->sum('balance');
$totalIncome = (float) $transactions->where('transaction_type', 'income')->sum('amount');
$totalExpense = (float) $transactions->where('transaction_type', 'expense')->sum('amount');
$totalTransfer = (float) $transactions->where('transaction_type', 'transfer')->sum('amount');

echo "[A] RINGKASAN GLOBAL\n";
echo "- Total akun aktif: " . $accounts->count() . "\n";
echo "- Total transaksi: " . $transactions->count() . "\n";
echo "- Total saldo akun saat ini: " . number_format($totalBalance, 2, ',', '.') . "\n";
echo "- Total income: " . number_format($totalIncome, 2, ',', '.') . "\n";
echo "- Total expense: " . number_format($totalExpense, 2, ',', '.') . "\n";
echo "- Total transfer (nominal): " . number_format($totalTransfer, 2, ',', '.') . "\n";
echo "- Net (income-expense): " . number_format($totalIncome - $totalExpense, 2, ',', '.') . "\n\n";

echo "[B] DETAIL SALDO PER AKUN\n";
foreach ($accounts as $acc) {
    $accTrans = $transactions->where('account_id', $acc->account_id);
    $inc = (float) $accTrans->where('transaction_type', 'income')->sum('amount');
    $exp = (float) $accTrans->where('transaction_type', 'expense')->sum('amount');
    $trfOut = (float) $accTrans->where('transaction_type', 'transfer')->sum('amount');
    $trfOutTable = 0.0;
    $trfInTable = 0.0;

    if (DB::getSchemaBuilder()->hasTable('transfers')) {
        $trfOutTable = (float) DB::table('transfers')->where('from_account_id', $acc->account_id)->sum('amount');
        $trfInTable = (float) DB::table('transfers')->where('to_account_id', $acc->account_id)->sum('amount');
    }

    echo "- {$acc->account_name} ({$acc->account_type})\n";
    echo "  saldo sekarang : " . number_format((float) $acc->balance, 2, ',', '.') . "\n";
    echo "  income akun    : " . number_format($inc, 2, ',', '.') . "\n";
    echo "  expense akun   : " . number_format($exp, 2, ',', '.') . "\n";
    echo "  transfer keluar (tx): " . number_format($trfOut, 2, ',', '.') . "\n";
    echo "  transfer keluar (tbl): " . number_format($trfOutTable, 2, ',', '.') . "\n";
    echo "  transfer masuk (tbl): " . number_format($trfInTable, 2, ',', '.') . "\n";
}

echo "\n[C] CEK TRANSAKSI MENCURIGAKAN\n";

$sampleRows = Transaction::where('user_id', $userId)
    ->where(function ($q) {
        $q->where('notes', 'like', '%Sample data%')
          ->orWhere('description', 'like', '%Sample%')
          ->orWhere('notes', 'like', '%Auto-created%');
    })
    ->orderByDesc('transaction_date')
    ->limit(20)
    ->get();

echo "- Transaksi dengan notes/desc sample-auto: " . $sampleRows->count() . "\n";
foreach ($sampleRows as $t) {
    echo "  #{$t->transaction_id} {$t->transaction_date} {$t->transaction_type} "
      . number_format((float)$t->amount, 2, ',', '.')
      . " | {$t->description} | {$t->notes}\n";
}

echo "\n[D] TOP 10 TRANSAKSI TERBESAR\n";
$top = Transaction::where('user_id', $userId)
    ->orderByDesc('amount')
    ->limit(10)
    ->get();
foreach ($top as $t) {
    echo "- #{$t->transaction_id} {$t->transaction_date} {$t->transaction_type} "
      . number_format((float)$t->amount, 2, ',', '.')
      . " | {$t->description}\n";
}

echo "\n[E] RINGKASAN BULANAN\n";
$monthly = Transaction::where('user_id', $userId)
    ->selectRaw("DATE_FORMAT(transaction_date, '%Y-%m') as ym")
    ->selectRaw("SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END) as inc")
    ->selectRaw("SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END) as exp")
    ->groupBy('ym')
    ->orderBy('ym', 'desc')
    ->limit(12)
    ->get();

foreach ($monthly as $m) {
    $net = (float)$m->inc - (float)$m->exp;
    echo "- {$m->ym} | income=" . number_format((float)$m->inc, 2, ',', '.')
      . " | expense=" . number_format((float)$m->exp, 2, ',', '.')
      . " | net=" . number_format($net, 2, ',', '.') . "\n";
}

echo "\n=== SELESAI ===\n";
