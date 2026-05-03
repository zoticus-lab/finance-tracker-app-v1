<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$rows = \App\Models\Credit::orderByDesc('credit_id')->limit(10)->get([
    'credit_id',
    'debtor_name',
    'total_amount',
    'received_amount',
    'remaining_amount',
    'account_id',
    'start_date',
    'created_at',
]);

echo "=== LATEST CREDITS ===\n";
foreach ($rows as $r) {
    echo "#{$r->credit_id} | {$r->debtor_name} | amount={$r->total_amount} | account_id=" . ($r->account_id ?? 'NULL') . " | start={$r->start_date} | created={$r->created_at}\n";
}
