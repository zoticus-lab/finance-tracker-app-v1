<?php

/**
 * SQL Cleanup Script
 * - Removes SHOW WARNINGS statements
 * - Removes INSERT statements for views
 * - Ensures correct structure
 */

$inputFile = $argv[1] ?? '../database_export_updated.sql';
$outputFile = $argv[2] ?? '../database_export_clean.sql';

echo "Cleaning SQL file: $inputFile\n";

if (!file_exists($inputFile)) {
    echo "Error: File not found\n";
    exit(1);
}

$content = file_get_contents($inputFile);
$lines = explode("\n", $content);

$output = [];
$skipUntilNextStatement = false;
$inInsertForView = false;

// List of views that shouldn't have INSERT data
$views = ['account_summary', 'daily_cash_flow', 'goal_progress', 'monthly_budget_status'];

foreach ($lines as $lineNum => $line) {
    $trimmed = trim($line);
    
    // Skip SHOW WARNINGS and related comment blocks
    if (str_starts_with($trimmed, 'SHOW WARNINGS;')) {
        continue;
    }
    
    // Skip warning comment lines
    if (str_starts_with($trimmed, '/* Warning:') || str_starts_with($trimmed, '/* Note:')) {
        continue;
    }
    
    // Skip SQL Error comments
    if (str_starts_with($trimmed, '/* SQL Error')) {
        continue;
    }
    
    // Skip Affected rows comments
    if (str_starts_with($trimmed, '/* Affected rows:')) {
        continue;
    }
    
    // Check for INSERT into views
    if (str_starts_with($trimmed, 'INSERT INTO')) {
        $isViewInsert = false;
        foreach ($views as $view) {
            if (str_contains($trimmed, "`$view`")) {
                $isViewInsert = true;
                break;
            }
        }
        
        if ($isViewInsert) {
            // Skip this line and lines until next statement
            continue;
        }
    }
    
    // Keep other lines
    $output[] = $line;
}

// Clean up multiple consecutive empty lines
$cleaned = [];
$lastEmpty = false;
foreach ($output as $line) {
    $trimmed = trim($line);
    
    if (empty($trimmed)) {
        if (!$lastEmpty) {
            $cleaned[] = $line;
            $lastEmpty = true;
        }
    } else {
        $cleaned[] = $line;
        $lastEmpty = false;
    }
}

$finalContent = implode("\n", $cleaned);

// Write cleaned file
file_put_contents($outputFile, $finalContent);

echo "✓ File cleaned successfully!\n";
echo "  Input:  " . basename($inputFile) . " (" . filesize($inputFile) . " bytes)\n";
echo "  Output: " . basename($outputFile) . " (" . filesize($outputFile) . " bytes)\n";
echo "\nCleaned:\n";
echo "  ✓ Removed SHOW WARNINGS statements\n";
echo "  ✓ Removed INSERT statements for views\n";
echo "  ✓ Removed warning/error comment lines\n";
echo "  ✓ Cleaned up empty lines\n";
