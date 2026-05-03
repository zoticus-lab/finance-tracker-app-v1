<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CHECK ACCOUNTS ===\n";
$accounts = \App\Models\Account::all(['account_id', 'account_name']);
echo "Total accounts: " . $accounts->count() . "\n";
foreach ($accounts as $acc) {
    echo "  ID: {$acc->account_id} | Name: {$acc->account_name}\n";
}

echo "\n=== FIX TRANSACTIONS: UPDATE MISSING CATEGORIES ===\n";

// Manually update transactions with correct categories based on notes
$updates = [
    'Dana Masuk dari Hutang' => [
        'Debt disbursement',
        'Auto-created from debt #'
    ],
    'Dana Keluar untuk Hutang' => [
        'Debt payment'
    ],
    'Pembayaran Piutang' => [
        'Credit payment',
        'Auto-created from credit payment #'
    ],
    'Piutang Diberikan' => [
        'Credit issued',
        'Auto-created from credit #'
    ]
];

$categoryMap = [];
foreach ($updates as $catName => $patterns) {
    $cat = \App\Models\Category::where('category_name', $catName)->first();
    if ($cat) {
        $categoryMap[$catName] = $cat->category_id;
    }
}

echo "Category mappings:\n";
foreach ($categoryMap as $name => $id) {
    echo "  $name → $id\n";
}

// Update transactions
echo "\nUpdating transactions...\n";

// Pembayaran Piutang (credit payment)
$updated = \App\Models\Transaction::whereNull('category_id')
    ->where('notes', 'like', '%credit payment%')
    ->update(['category_id' => $categoryMap['Pembayaran Piutang'] ?? null]);
echo "  ✓ Updated $updated 'Pembayaran Piutang' transactions\n";

// Piutang Diberikan (credit issued)
$updated = \App\Models\Transaction::whereNull('category_id')
    ->where('notes', 'like', '%credit %')
    ->where('transaction_type', 'expense')
    ->update(['category_id' => $categoryMap['Piutang Diberikan'] ?? null]);
echo "  ✓ Updated $updated 'Piutang Diberikan' transactions\n";

echo "\n=== VERIFICATION ===\n";
$trans = \App\Models\Transaction::orderByDesc('transaction_date')->limit(10)->get();
foreach ($trans as $t) {
    $cat_id = $t->category_id ?? 'NULL';
    echo "ID: {$t->transaction_id} | Type: {$t->transaction_type} | Cat_ID: {$cat_id} | Notes: {$t->notes}\n";
}
?>
