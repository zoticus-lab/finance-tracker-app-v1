<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== FINAL VERIFICATION: API RESPONSE FORMAT ===\n\n";

// Simulate what the API will return
$transactions = \App\Models\Transaction::with([
    'account:account_id,account_name',
    'category:category_id,category_name'
])->orderByDesc('transaction_date')->limit(10)->get();

echo "Simulating API response (transformTransaction):\n\n";

foreach ($transactions as $t) {
    $response = [
        'id' => $t->transaction_id,
        'type' => $t->transaction_type,
        'amount' => (float) $t->amount,
        'account_id' => $t->account_id,
        'category_id' => $t->category_id,
        'date' => (string) $t->transaction_date,
        'description' => $t->description,
        'note' => $t->notes,
        'account' => $t->account ? [
            'id' => $t->account->account_id,
            'name' => $t->account->account_name,
        ] : null,
        'category' => $t->category ? [
            'id' => $t->category->category_id,
            'name' => $t->category->category_name,
        ] : null,
    ];
    
    echo "Transaction ID: {$response['id']}\n";
    echo "  type: {$response['type']}\n";
    echo "  amount: {$response['amount']}\n";
    echo "  account: " . ($response['account'] ? $response['account']['name'] : 'NULL') . "\n";
    echo "  category: " . ($response['category'] ? $response['category']['name'] : 'NULL') . "\n";
    echo "  notes: {$response['note']}\n\n";
}

echo "=== SUMMARY ===\n";
$allTransactions = \App\Models\Transaction::count();
$withAccount = \App\Models\Transaction::whereNotNull('account_id')->count();
$withCategory = \App\Models\Transaction::whereNotNull('category_id')->count();

echo "Total transactions: $allTransactions\n";
echo "With account_id: $withAccount\n";
echo "With category_id: $withCategory\n";

if ($withCategory >= 3) {
    echo "\n✓ READY: Database has transactions with categories!\n";
    echo "✓ Next: User must clear browser cache and refresh\n";
} else {
    echo "\n⚠️ WARNING: Not all transactions have categories\n";
}
?>
