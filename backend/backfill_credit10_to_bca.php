<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Account;
use App\Models\Credit;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

$creditId = 10;
$targetAccountId = 1; // BCA

echo "=== BACKFILL CREDIT TO TRANSACTION ===\n";
echo "Credit ID: {$creditId} | Account ID: {$targetAccountId}\n\n";

$credit = Credit::find($creditId);
if (!$credit) {
    echo "Credit tidak ditemukan.\n";
    exit(1);
}

$exists = Transaction::where('notes', 'like', '%Auto-created from credit #' . $creditId . '%')
    ->where('transaction_type', 'expense')
    ->exists();

if ($exists) {
    echo "Transaksi expense untuk credit ini sudah ada. Tidak ada perubahan.\n";
    exit(0);
}

DB::beginTransaction();
try {
    $account = Account::where('account_id', $targetAccountId)->lockForUpdate()->first();
    if (!$account) {
        throw new RuntimeException('Akun target tidak ditemukan');
    }

    $amount = (float) $credit->total_amount;
    $before = (float) $account->balance;

    if (($before - $amount) < 0 && in_array(strtolower((string)$account->account_type), ['cash', 'bank', 'savings'], true)) {
        throw new RuntimeException('Saldo akun tidak cukup untuk backfill piutang ini');
    }

    $categoryId = \App\Models\Category::where('category_name', 'Piutang Diberikan')->value('category_id');

    $tx = Transaction::create([
        'user_id' => $credit->user_id,
        'account_id' => $targetAccountId,
        'transaction_type' => 'expense',
        'amount' => $amount,
        'category_id' => $categoryId,
        'transaction_date' => $credit->start_date,
        'description' => 'Credit issued to ' . $credit->debtor_name,
        'notes' => 'Auto-created from credit #' . $credit->credit_id,
    ]);

    $account->balance = $before - $amount;
    $account->save();

    $credit->account_id = $targetAccountId;
    $credit->save();

    DB::commit();

    echo "Berhasil backfill.\n";
    echo "Transaksi baru ID: {$tx->transaction_id}\n";
    echo "Saldo BCA sebelum: " . number_format($before, 0, ',', '.') . "\n";
    echo "Saldo BCA sesudah: " . number_format((float)$account->balance, 0, ',', '.') . "\n";
} catch (Throwable $e) {
    DB::rollBack();
    fwrite(STDERR, "Gagal: " . $e->getMessage() . "\n");
    exit(1);
}
