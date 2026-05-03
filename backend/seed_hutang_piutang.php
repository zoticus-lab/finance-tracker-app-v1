<?php
require 'vendor/autoload.php';
require 'bootstrap/app.php';

use App\Models\Transaction;
use App\Models\Category;
use App\Models\Account;

// Get or create account
$account = Account::firstOrCreate(
    ['account_id' => 1],
    ['name' => 'BCA', 'type' => 'bank', 'balance' => 5000000]
);

// Find Hutang and Piutang categories
$hutangCategories = Category::where('name', 'like', '%Hutang%')
    ->orWhere('name', 'like', '%Piutang%')
    ->orWhere('name', 'like', '%Debt%')
    ->orWhere('name', 'like', '%Dana Masuk%')
    ->get();

echo "Found categories: " . $hutangCategories->count() . "\n";
foreach ($hutangCategories as $cat) {
    echo "- " . $cat->name . " (ID: " . $cat->category_id . ")\n";
}

// Create sample Hutang & Piutang transactions for current month (March 2026)
$now = new DateTime('2026-03-29');

$sampleTransactions = [
    [
        'type' => 'expense',
        'category_name' => 'Debt Payment',
        'amount' => 500000,
        'date' => '2026-03-10',
        'description' => 'Bayar hutang ke Budi',
    ],
    [
        'type' => 'income',
        'category_name' => 'Pembayaran Piutang',
        'amount' => 1000000,
        'date' => '2026-03-15',
        'description' => 'Terima pembayaran piutang dari Anto',
    ],
    [
        'type' => 'expense',
        'category_name' => 'Debt Payment',
        'amount' => 300000,
        'date' => '2026-03-20',
        'description' => 'Bayar cicilan hutang ke bank',
    ],
    [
        'type' => 'income',
        'category_name' => 'Dana Masuk dari Hutang',
        'amount' => 2000000,
        'date' => '2026-03-22',
        'description' => 'Dana masuk dari teman untuk hutang',
    ],
];

foreach ($sampleTransactions as $trans) {
    $category = Category::where('name', 'like', '%' . $trans['category_name'] . '%')->first();
    
    if (!$category) {
        echo "Warning: Category not found: " . $trans['category_name'] . "\n";
        continue;
    }
    
    Transaction::create([
        'user_id' => 1,
        'account_id' => $account->account_id,
        'category_id' => $category->category_id,
        'type' => $trans['type'],
        'amount' => $trans['amount'],
        'date' => $trans['date'],
        'description' => $trans['description'],
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    echo "Created: " . $trans['category_name'] . " - " . $trans['description'] . "\n";
}

echo "\n✅ Sample Hutang & Piutang transactions created!\n";
?>
