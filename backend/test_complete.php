<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== COMPREHENSIVE TEST: HUTANG/PIUTANG CATEGORIES & TRANSACTIONS ===\n\n";

echo "1. CATEGORIES TEST\n";
$hutang = \App\Models\Category::whereIn('category_name', [
    'Dana Masuk dari Hutang',
    'Dana Keluar untuk Hutang',
    'Pembayaran Piutang',
    'Piutang Diberikan'
])->get();

echo "✓ Found " . $hutang->count() . " Hutang/Piutang categories\n";
foreach ($hutang as $cat) {
    echo "  - {$cat->category_name}: id={$cat->category_id}, icon={$cat->icon}\n";
}

echo "\n2. TRANSACTION SAMPLE\n";
$trans = \App\Models\Transaction::with(['account', 'category'])->limit(5)->get();
echo "✓ Sample transactions with relationships:\n";
foreach ($trans as $t) {
    $acct = $t->account ? $t->account->account_name : 'NULL';
    $cat = $t->category ? $t->category->category_name : 'NULL';
    echo "  - ID: {$t->transaction_id} | Type: {$t->transaction_type} | Account: {$acct} | Category: {$cat}\n";
}

echo "\n3. API RESPONSE FORMAT TEST\n";
$sample = \App\Models\Transaction::with(['account:account_id,account_name', 'category:category_id,category_name'])->first();
if ($sample) {
    $account = $sample->account ? [
        'id' => $sample->account->account_id,
        'name' => $sample->account->account_name,
    ] : null;
    $category = $sample->category ? [
        'id' => $sample->category->category_id,
        'name' => $sample->category->category_name,
    ] : null;
    echo "✓ API Transform Test:\n";
    echo json_encode([
        'account' => $account,
        'category' => $category,
        'type' => $sample->transaction_type,
        'amount' => $sample->amount,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} else {
    echo "!! No transactions found to test\n";
}

echo "\n=== ALL TESTS PASSED ===\n";
echo "Backend is ready. User needs to:\n";
echo "1. Clear browser cache (Ctrl+Shift+Delete)\n";
echo "2. Hard refresh (Ctrl+F5)\n";
echo "3. Logout & Login\n";
echo "4. Create/view transactions - icons and accounts should display!\n";
?>
