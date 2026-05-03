<?php

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/bootstrap/app.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$connection = config('database.default');
$databaseConfig = config("database.connections.$connection");

if ($connection === 'mysql') {
    $host = $databaseConfig['host'];
    $database = $databaseConfig['database'];
    $username = $databaseConfig['username'];
    $password = $databaseConfig['password'];
    $port = $databaseConfig['port'] ?? 3306;
    
    // Try to find mysqldump in common locations
    $mysqldumpPaths = [
        'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
        'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
        'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
        'C:\\Program Files (x86)\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
        'C:\\wamp64\\bin\\mysql\\mysql8.0.13\\bin\\mysqldump.exe',
        'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    ];
    
    $mysqldump = null;
    foreach ($mysqldumpPaths as $path) {
        if (file_exists($path)) {
            $mysqldump = $path;
            break;
        }
    }
    
    if (!$mysqldump) {
        echo "Error: mysqldump not found. Trying manual export...\n";
        // Fallback: export using PHP
        exportDatabasePHP($database);
    } else {
        $passwordOption = $password ? "-p$password" : '';
        $command = "\"$mysqldump\" -h $host -u $username $passwordOption --port=$port $database";
        $outputFile = __DIR__ . '/../database_export_updated.sql';
        
        echo "Exporting database to: $outputFile\n";
        exec("$command > \"$outputFile\" 2>&1", $output, $return);
        
        if ($return === 0) {
            echo "Database exported successfully!\n";
            echo "File size: " . filesize($outputFile) . " bytes\n";
        } else {
            echo "Error exporting database\n";
            echo implode("\n", $output);
            exportDatabasePHP($database);
        }
    }
} else {
    exportDatabasePHP($databaseConfig['database']);
}

function exportDatabasePHP($database) {
    echo "Performing manual database export using PHP...\n";
    
    $tables = DB::select('SHOW TABLES');
    $tableKey = 'Tables_in_' . $database;
    
    $sql = "-- Database Export: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: $database\n\n";
    
    foreach ($tables as $table) {
        $tableName = $table->$tableKey;
        
        // Get create table statement
        $createResult = DB::select("SHOW CREATE TABLE `$tableName`");
        $sql .= "\n" . $createResult[0]->{'Create Table'} . ";\n\n";
        
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
                    return "'" . str_replace("'", "''", $val) . "'";
                }, (array)$row);
                
                $sql .= "INSERT INTO `$tableName` ($columnStr) VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }
    }
    
    $outputFile = __DIR__ . '/../database_export_updated.sql';
    file_put_contents($outputFile, $sql);
    
    echo "Database exported successfully to: $outputFile\n";
    echo "File size: " . filesize($outputFile) . " bytes\n";
}
