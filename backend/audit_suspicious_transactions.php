<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Models\User;

$user = User::first();
if (!$user) {
    echo "Tidak ada user ditemukan.\n";
    exit(1);
}

$userId = $user->user_id;

echo "=== AUDIT TRANSAKSI MENCURIGAKAN ===\n";
echo "User: {$user->email} (ID {$userId})\n\n";

$candidates = Transaction::where('user_id', $userId)
    ->where(function ($q) {
        $q->where('notes', 'like', '%Auto-created%')
            ->orWhere('notes', 'like', '%Sample data%')
            ->orWhere('description', 'like', '%Credit issued%')
            ->orWhere('description', 'like', '%Credit payment%')
            ->orWhere('description', 'like', '%Sample%');
    })
    ->orderBy('transaction_date', 'asc')
    ->orderBy('transaction_id', 'asc')
    ->get();

if ($candidates->isEmpty()) {
    echo "Tidak ada kandidat transaksi mencurigakan berdasarkan pola saat ini.\n";
    exit(0);
}

$totalIncome = 0.0;
$totalExpense = 0.0;

printf("%-6s %-12s %-9s %-14s %-22s %s\n", 'ID', 'Tanggal', 'Type', 'Nominal', 'Akun', 'Keterangan');
printf("%'-95s\n", '');

foreach ($candidates as $t) {
    $amount = (float) $t->amount;
    if ($t->transaction_type === 'income') {
        $totalIncome += $amount;
    } elseif ($t->transaction_type === 'expense') {
        $totalExpense += $amount;
    }

    $accountName = $t->account?->account_name ?? '-';
    $desc = trim(($t->description ?? '') . ' | ' . ($t->notes ?? ''));
    $desc = mb_substr($desc, 0, 120);

    printf(
        "%-6s %-12s %-9s %-14s %-22s %s\n",
        $t->transaction_id,
        (string) $t->transaction_date,
        $t->transaction_type,
        number_format($amount, 0, ',', '.'),
        $accountName,
        $desc
    );
}

echo "\n=== RINGKASAN DAMPAK KANDIDAT ===\n";
echo "Total income kandidat : " . number_format($totalIncome, 0, ',', '.') . "\n";
echo "Total expense kandidat: " . number_format($totalExpense, 0, ',', '.') . "\n";
echo "Net kandidat (inc-exp): " . number_format($totalIncome - $totalExpense, 0, ',', '.') . "\n";

echo "\nCatatan:\n";
echo "- Jika transaksi income kandidat dihapus, saldo akan turun.\n";
echo "- Jika transaksi expense kandidat dihapus, saldo akan naik.\n";
echo "- Jangan hapus transfer tanpa cek tabel transfers agar saldo antar akun tetap konsisten.\n";
