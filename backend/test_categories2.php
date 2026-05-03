<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$expenses = \App\Models\Category::where('is_system_default', true)->where('category_type', 'expense')->limit(10)->get();
echo "Sample expense categories from database:\n";
foreach ($expenses as $cat) {
    echo "ID: {$cat->id} | Name: {$cat->category_name} | Icon: '{$cat->icon}' | Color: {$cat->color_code}\n";
}
?>
