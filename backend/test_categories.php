<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$total = \App\Models\Category::where('is_system_default', true)->count();
$withIcon = \App\Models\Category::where('is_system_default', true)->whereNotNull('icon')->count();
$sample = \App\Models\Category::where('is_system_default', true)->first();

echo "✓ Total default categories: $total\n";
echo "✓ Categories with icon: $withIcon\n";
if ($sample) {
    echo "✓ Sample: {$sample->category_name} → {$sample->icon}\n";
}

$expenses = \App\Models\Category::where('is_system_default', true)->where('category_type', 'expense')->limit(5)->get();
echo "\nFirst 5 expense categories:\n";
foreach ($expenses as $cat) {
    echo "  - {$cat->category_name}: {$cat->icon}\n";
}
?>
