<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

$targetId = 22;

echo "=== REMOVE INVALID TRANSACTION ===\n";
echo "Target ID: {$targetId}\n\n";

$tx = Transaction::with('account')->where('transaction_id', $targetId)->first();
if (!$tx) {
    echo "Transaksi tidak ditemukan. Tidak ada perubahan.\n";
    exit(0);
}

$amount = (float) $tx->amount;
$type = (string) $tx->transaction_type;
$accountId = (int) $tx->account_id;

echo "Ditemukan: {$tx->transaction_date} | {$type} | " . number_format($amount, 0, ',', '.') . "\n";
echo "Akun: " . ($tx->account?->account_name ?? 'N/A') . " (ID {$accountId})\n";
echo "Desc: {$tx->description}\n";
echo "Notes: {$tx->notes}\n\n";

DB::beginTransaction();
try {
    $account = Account::where('account_id', $accountId)->lockForUpdate()->first();
    if (!$account) {
        throw new RuntimeException("Akun {$accountId} tidak ditemukan");
    }

    $before = (float) $account->balance;

    // Reverse impact exactly like delete logic in TransactionController
    if ($type === 'income') {
        $account->balance = $before - $amount;
    } elseif ($type === 'expense') {
        $account->balance = $before + $amount;
    } else {
        // transfer should be handled with transfers table, skipped intentionally
        throw new RuntimeException('Transaksi transfer tidak didukung oleh script ini');
    }

    $after = (float) $account->balance;
    $account->save();

    $tx->delete();

    DB::commit();

    echo "Berhasil dihapus dan saldo dikoreksi.\n";
    echo "Saldo akun sebelum: " . number_format($before, 0, ',', '.') . "\n";
    echo "Saldo akun sesudah: " . number_format($after, 0, ',', '.') . "\n";
} catch (Throwable $e) {
    DB::rollBack();
    fwrite(STDERR, "Gagal: " . $e->getMessage() . "\n");
    exit(1);
}
