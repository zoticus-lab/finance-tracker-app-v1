<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Delete all system default categories
$deleted = \App\Models\Category::where('is_system_default', true)->delete();
echo "✓ Deleted $deleted system default categories\n";

// Run the seeder
$seeder = new \Database\Seeders\CategoryTemplateSeeder();
$seeder->run();
echo "✓ Seeder ran successfully\n";

// Verify
$total = \App\Models\Category::count();
$sample = \App\Models\Category::orderBy('category_name')->first();

echo "\n✓ Total categories: $total\n";
echo "✓ Sample: {$sample->category_name} → Icon: {$sample->icon}\n";

// Show 5 expense samples
$expenses = \App\Models\Category::where('category_type', 'expense')->limit(5)->get();
echo "\nFirst 5 expense categories:\n";
foreach ($expenses as $cat) {
    echo "  - {$cat->category_name}: {$cat->icon}\n";
}
?>
