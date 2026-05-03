<?php

/**
 * SQL File Reorganizer
 * Moves all table definitions before view definitions
 * Usage: php organize_sql.php input.sql output.sql
 */

if ($argc < 2) {
    echo "Usage: php organize_sql.php <input_file> [output_file]\n";
    echo "Example: php organize_sql.php database_export_updated.sql database_export_organized.sql\n";
    exit(1);
}

$inputFile = $argv[1];
$outputFile = $argv[2] ?? str_replace('.sql', '_organized.sql', $inputFile);

if (!file_exists($inputFile)) {
    echo "Error: File not found: $inputFile\n";
    exit(1);
}

echo "Reading file: $inputFile\n";
$content = file_get_contents($inputFile);

// Split into lines
$lines = explode("\n", $content);

// Categories for SQL statements
$header = [];           // Initial comments and CREATE DATABASE
$dropViews = [];        // DROP VIEW statements
$dropTables = [];       // DROP TABLE statements
$createTables = [];     // CREATE TABLE statements
$createViews = [];      // CREATE VIEW statements (with CREATE ALGORITHM)
$inserts = [];          // INSERT statements

$i = 0;
$currentBlock = null;
$currentStatement = '';

while ($i < count($lines)) {
    $line = $lines[$i];
    $trimmed = trim($line);
    
    // Header section (before any DROP/CREATE)
    if (empty($currentBlock) && (str_starts_with($trimmed, '--') || str_starts_with($trimmed, 'CREATE DATABASE') || str_starts_with($trimmed, 'USE '))) {
        if (str_starts_with($trimmed, 'CREATE DATABASE') || str_starts_with($trimmed, 'USE ')) {
            $header[] = $line;
        } else {
            $header[] = $line;
        }
        $i++;
        continue;
    }
    
    // DROP VIEW
    if (str_starts_with($trimmed, 'DROP VIEW')) {
        $statement = '';
        while ($i < count($lines)) {
            $statement .= $lines[$i] . "\n";
            if (str_contains($lines[$i], ';')) {
                break;
            }
            $i++;
        }
        $dropViews[] = rtrim($statement);
        $i++;
        continue;
    }
    
    // DROP TABLE
    if (str_starts_with($trimmed, 'DROP TABLE')) {
        $statement = '';
        while ($i < count($lines)) {
            $statement .= $lines[$i] . "\n";
            if (str_contains($lines[$i], ';')) {
                break;
            }
            $i++;
        }
        $dropTables[] = rtrim($statement);
        $i++;
        continue;
    }
    
    // CREATE TABLE
    if (str_starts_with($trimmed, 'CREATE TABLE')) {
        $statement = '';
        while ($i < count($lines)) {
            $statement .= $lines[$i] . "\n";
            if (str_contains($lines[$i], ';') && !str_ends_with(trim($lines[$i]), ',')) {
                break;
            }
            $i++;
        }
        $createTables[] = rtrim($statement);
        $i++;
        continue;
    }
    
    // CREATE VIEW or CREATE ALGORITHM (views)
    if (str_starts_with($trimmed, 'CREATE ALGORITHM') || str_starts_with($trimmed, 'CREATE VIEW')) {
        $statement = '';
        while ($i < count($lines)) {
            $statement .= $lines[$i] . "\n";
            if (str_contains($lines[$i], ';')) {
                break;
            }
            $i++;
        }
        $createViews[] = rtrim($statement);
        $i++;
        continue;
    }
    
    // INSERT statements
    if (str_starts_with($trimmed, 'INSERT INTO')) {
        $statement = '';
        while ($i < count($lines)) {
            $statement .= $lines[$i] . "\n";
            if (str_contains($lines[$i], ';')) {
                break;
            }
            $i++;
        }
        $inserts[] = rtrim($statement);
        $i++;
        continue;
    }
    
    // Skip empty lines and other statements
    $i++;
}

// Build output in correct order
$output = [];

// 1. Header
$output = array_merge($output, $header);
$output[] = '';

// 2. Disable foreign key checks
$output[] = 'SET FOREIGN_KEY_CHECKS=0;';
$output[] = '';

// 3. Drop tables (with DROP VIEW removed since we'll recreate views)
$output = array_merge($output, $dropTables);
$output[] = '';

// 4. Create tables
$output = array_merge($output, $createTables);
$output[] = '';

// 5. Insert data
$output = array_merge($output, $inserts);
$output[] = '';

// 6. Re-enable foreign key checks
$output[] = 'SET FOREIGN_KEY_CHECKS=1;';
$output[] = '';

// 7. Drop and create views at the end
if (!empty($createViews)) {
    $output[] = '-- =====================================================';
    $output[] = '-- VIEWS (Created last, after all tables exist)';
    $output[] = '-- =====================================================';
    $output[] = '';
    
    // Add drop view statements
    foreach ($dropViews as $dropView) {
        $output[] = $dropView;
    }
    $output[] = '';
    
    // Add create view statements
    foreach ($createViews as $createView) {
        $output[] = $createView;
    }
}

// Write output
$finalOutput = implode("\n", $output);
file_put_contents($outputFile, $finalOutput);

echo "✓ File reorganized successfully!\n";
echo "  Input:  $inputFile\n";
echo "  Output: $outputFile\n";
echo "  Size:   " . number_format(filesize($outputFile)) . " bytes\n";
echo "\nOrganization:\n";
echo "  1. Header & Database creation\n";
echo "  2. DROP TABLE statements\n";
echo "  3. CREATE TABLE statements\n";
echo "  4. INSERT statements\n";
echo "  5. CREATE VIEW statements (at the end)\n";
