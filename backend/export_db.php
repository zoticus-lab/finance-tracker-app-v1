<?php
require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    echo "Starting database export...\n";
    
    $tables = DB::select('SHOW TABLES');
    $database = config('database.connections.mysql.database');
    $tableKey = 'Tables_in_' . $database;
    
    $sql = "-- Database Export: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: $database\n";
    $sql .= "-- Host: " . config('database.connections.mysql.host') . "\n\n";
    
    $tableCount = 0;
    $recordCount = 0;
    
    foreach ($tables as $table) {
        $tableName = $table->$tableKey;
        echo "Exporting table: $tableName\n";
        
        // Drop table
        $sql .= "\nDROP TABLE IF EXISTS `$tableName`;\n";
        
        // Get create table statement
        $createResult = DB::select("SHOW CREATE TABLE `$tableName`");
        $createKey = array_keys((array)$createResult[0])[1];
        $sql .= $createResult[0]->$createKey . ";\n";
        
        // Get table data
        $rows = DB::table($tableName)->get();
        
        if (count($rows) > 0) {
            $columns = array_keys((array)$rows[0]);
            $columnStr = '`' . implode('`, `', $columns) . '`';
            
            foreach ($rows as $row) {
                $values = array_map(function($val) {
                    if ($val === null) {
                        return 'NULL';
                    }
                    if (is_numeric($val)) {
                        return $val;
                    }
                    return "'" . str_replace("'", "''", $val) . "'";
                }, (array)$row);
                
                $sql .= "INSERT INTO `$tableName` ($columnStr) VALUES (" . implode(', ', $values) . ");\n";
                $recordCount++;
            }
        }
        
        $tableCount++;
    }
    
    $outputFile = __DIR__ . '/../database_export_updated.sql';
    file_put_contents($outputFile, $sql);
    
    echo "\n✓ Database exported successfully!\n";
    echo "  File: $outputFile\n";
    echo "  Size: " . number_format(filesize($outputFile)) . " bytes\n";
    echo "  Tables: $tableCount\n";
    echo "  Records: $recordCount\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
