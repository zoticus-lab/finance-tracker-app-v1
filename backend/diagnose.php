<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CHECK RECENT TRANSACTIONS ===\n\n";

// Check recent transactions with all details
$trans = \App\Models\Transaction::with(['account:account_id,account_name', 'category:category_id,category_name'])
    ->orderByDesc('transaction_date')
    ->limit(15)
    ->get();

echo "Recent transactions (15):\n";
foreach ($trans as $t) {
    $acct_name = $t->account?->account_name ?? 'NULL';
    $cat_name = $t->category?->category_name ?? 'NULL';
    echo "ID: {$t->transaction_id} | Date: {$t->transaction_date} | Type: {$t->transaction_type} | ";
    echo "Amount: {$t->amount} | Acct_ID: {$t->account_id} ({$acct_name}) | Cat_ID: {$t->category_id} ({$cat_name}) | ";
    echo "Notes: {$t->notes}\n";
}

echo "\n=== PROBLEM DIAGNOSIS ===\n";

$nullAccount = \App\Models\Transaction::whereNull('account_id')->count();
$nullCategory = \App\Models\Transaction::whereNull('category_id')->count();
$totalTrans = \App\Models\Transaction::count();

echo "Total transactions: $totalTrans\n";
echo "Transactions with NULL account_id: $nullAccount\n";
echo "Transactions with NULL category_id: $nullCategory\n";

if ($nullCategory > 0) {
    echo "\n⚠️  ISSUE: Some transactions have NULL category_id\n";
    echo "This likely means:\n";
    echo "1. Hutang/Piutang transactions created BEFORE the fix were applied\n";
    echo "2. Those old transactions need category_id updated OR deleted and re-created\n";
}

// Check if Hutang/Piutang categories exist
echo "\n=== HUTANG/PIUTANG CATEGORIES ===\n";
$hutang = \App\Models\Category::whereIn('category_name', [
    'Dana Masuk dari Hutang',
    'Dana Keluar untuk Hutang',
    'Pembayaran Piutang',
    'Piutang Diberikan'
])->get();

foreach ($hutang as $cat) {
    echo "✓ {$cat->category_name}: ID={$cat->category_id}\n";
}
?>
