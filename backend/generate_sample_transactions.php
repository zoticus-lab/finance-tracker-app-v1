<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== GENERATE 1 MONTH SAMPLE TRANSACTIONS ===\n\n";

// Get first user
$user = \App\Models\User::first();
if (!$user) {
    echo "Error: No users found\n";
    exit(1);
}

$accounts = \App\Models\Account::where('user_id', $user->user_id)->get();
if ($accounts->isEmpty()) {
    echo "Error: No accounts found\n";
    exit(1);
}

$categories = \App\Models\Category::where('is_system_default', true)->get();
if ($categories->isEmpty()) {
    echo "Error: No categories found\n";
    exit(1);
}

// Get category by name helper
$getCatByName = function($name) use ($categories) {
    return $categories->firstWhere('category_name', $name)?->category_id;
};

// Sample transactions for March 2026
$transactions = [
    // Week 1
    ['2026-03-01', 'income', 5000000, 'Salary', $getCatByName('Salary'), $accounts[0]->account_id],
    ['2026-03-02', 'expense', 150000, 'Groceries - Carrefour', $getCatByName('Groceries'), $accounts[1]->account_id],
    ['2026-03-03', 'expense', 50000, 'Fuel - Shell', $getCatByName('Fuel'), $accounts[1]->account_id],
    ['2026-03-04', 'expense', 120000, 'Makan siang dengan klien', $getCatByName('Dining Out'), $accounts[1]->account_id],
    ['2026-03-05', 'income', 200000, 'Freelance project', $getCatByName('Freelance'), $accounts[0]->account_id],
    
    // Week 2
    ['2026-03-08', 'expense', 2500000, 'Cicilan Rumah', $getCatByName('Rent'), $accounts[0]->account_id],
    ['2026-03-09', 'expense', 300000, 'Obat - Apotek K24', $getCatByName('Medicine'), $accounts[1]->account_id],
    ['2026-03-10', 'expense', 450000, 'Tagihan Internet', $getCatByName('Internet'), $accounts[0]->account_id],
    ['2026-03-11', 'expense', 80000, 'Coffee break', $getCatByName('Coffee & Tea'), $accounts[1]->account_id],
    ['2026-03-12', 'expense', 1200000, 'Belanja bulanan - Indomaret', $getCatByName('Groceries'), $accounts[1]->account_id],
    
    // Week 3
    ['2026-03-15', 'income', 1500000, 'Bonus proyek selesai', $getCatByName('Bonus'), $accounts[0]->account_id],
    ['2026-03-16', 'expense', 300000, 'Bensin & maintenance motor', $getCatByName('Vehicle Service'), $accounts[1]->account_id],
    ['2026-03-18', 'expense', 350000, 'Gedung bioskop & makan', $getCatByName('Entertainment'), $accounts[1]->account_id],
    ['2026-03-20', 'expense', 150000, 'Donasi tempat ibadah', $getCatByName('Donation'), $accounts[1]->account_id],
    
    // Week 4
    ['2026-03-22', 'income', 750000, 'Cashback credit card', $getCatByName('Cashback'), $accounts[0]->account_id],
    ['2026-03-23', 'expense', 500000, 'Beli kursi kerja', $getCatByName('Furniture'), $accounts[0]->account_id],
    ['2026-03-25', 'expense', 200000, 'Kursus online - Udemy', $getCatByName('Course'), $accounts[0]->account_id],
    ['2026-03-27', 'expense', 85000, 'Snacks kantor', $getCatByName('Snacks'), $accounts[1]->account_id],
    ['2026-03-29', 'income', 100000, 'Cashback makanan', $getCatByName('Cashback'), $accounts[0]->account_id],
];

echo "Creating " . count($transactions) . " sample transactions...\n";

foreach ($transactions as [$date, $type, $amount, $desc, $cat_id, $acc_id]) {
    \App\Models\Transaction::create([
        'user_id' => $user->user_id,
        'account_id' => $acc_id,
        'transaction_type' => $type,
        'amount' => $amount,
        'category_id' => $cat_id,
        'description' => $desc,
        'transaction_date' => $date,
        'notes' => 'Sample data for March 2026'
    ]);
}

echo "✓ Created " . count($transactions) . " transactions\n\n";

// Verify
$count = \App\Models\Transaction::where('user_id', $user->user_id)->whereMonth('transaction_date', 3)->count();
echo "✓ Total transactions in March 2026: $count\n";

$income = \App\Models\Transaction::where('user_id', $user->user_id)
    ->where('transaction_type', 'income')
    ->whereMonth('transaction_date', 3)
    ->sum('amount');

$expense = \App\Models\Transaction::where('user_id', $user->user_id)
    ->where('transaction_type', 'expense')
    ->whereMonth('transaction_date', 3)
    ->sum('amount');

echo "✓ Total Income: IDR " . number_format($income, 0, ',', '.') . "\n";
echo "✓ Total Expense: IDR " . number_format($expense, 0, ',', '.') . "\n";
echo "✓ Net: IDR " . number_format($income - $expense, 0, ',', '.') . "\n";
?>
