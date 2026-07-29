<?php

/**
 * Database Setup Script
 * Creates database if not exists and imports the SQL dump
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Determine the backend path
$backendPath = file_exists(__DIR__ . '/backend/vendor/autoload.php')
    ? __DIR__ . '/backend'
    : getcwd() . '/backend';

if (!file_exists($backendPath . '/vendor/autoload.php')) {
    echo "❌ Cannot find Laravel installation. Make sure you run this from project root.\n";
    exit(1);
}

require $backendPath . '/vendor/autoload.php';

$app = require $backendPath . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use PDO;

class DatabaseSetup {
    private $config;
    private $connection;
    
    public function __construct() {
        $this->config = config('database.connections.mysql');
    }
    
    /**
     * Check if database exists
     */
    public function databaseExists() {
        try {
            $pdo = new PDO(
                "mysql:host={$this->config['host']};port={$this->config['port']}",
                $this->config['username'],
                $this->config['password']
            );
            
            $stmt = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{$this->config['database']}'");
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            echo "❌ Connection failed: {$e->getMessage()}\n";
            return false;
        }
    }
    
    /**
     * Create database
     */
    public function createDatabase() {
        try {
            $pdo = new PDO(
                "mysql:host={$this->config['host']};port={$this->config['port']}",
                $this->config['username'],
                $this->config['password']
            );
            
            $dbName = $this->config['database'];
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            echo "✓ Database '{$dbName}' created successfully\n";
            return true;
        } catch (Exception $e) {
            echo "❌ Failed to create database: {$e->getMessage()}\n";
            return false;
        }
    }
    
    /**
     * Import SQL dump file
     */
    public function importSqlFile($filePath) {
        if (!file_exists($filePath)) {
            echo "❌ SQL file not found: {$filePath}\n";
            return false;
        }
        
        try {
            $pdo = new PDO(
                "mysql:host={$this->config['host']};port={$this->config['port']};dbname={$this->config['database']}",
                $this->config['username'],
                $this->config['password']
            );
            
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            echo "Importing SQL file: {$filePath}\n";
            
            $sql = file_get_contents($filePath);
            
            // Split by semicolon and execute each statement
            $statements = array_filter(
                array_map('trim', explode(';', $sql)),
                fn($stmt) => !empty($stmt) && !str_starts_with($stmt, '--')
            );
            
            $count = 0;
            foreach ($statements as $statement) {
                try {
                    if (!empty(trim($statement))) {
                        $pdo->exec($statement);
                        $count++;
                    }
                } catch (Exception $e) {
                    echo "⚠ Error executing statement (continuing): {$e->getMessage()}\n";
                }
            }
            
            echo "✓ Imported {$count} SQL statements\n";
            return true;
            
        } catch (Exception $e) {
            echo "❌ Import failed: {$e->getMessage()}\n";
            return false;
        }
    }
    
    /**
     * Verify database setup
     */
    public function verify() {
        try {
            $tables = DB::select('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?', 
                [$this->config['database']]);
            
            $tableCount = count($tables);
            
            if ($tableCount === 0) {
                echo "⚠ Database exists but is empty\n";
                return false;
            }
            
            echo "✓ Database verification successful\n";
            echo "  Tables found: {$tableCount}\n";
            
            // Show some basic info
            $users = DB::table('users')->count();
            $transactions = DB::table('transactions')->count();
            $accounts = DB::table('accounts')->count();
            
            echo "\nDatabase Summary:\n";
            echo "  Users: {$users}\n";
            echo "  Accounts: {$accounts}\n";
            echo "  Transactions: {$transactions}\n";
            
            return true;
        } catch (Exception $e) {
            echo "❌ Verification failed: {$e->getMessage()}\n";
            return false;
        }
    }
}

// Main execution
echo "================================\n";
echo "Database Setup Script\n";
echo "================================\n\n";

$setup = new DatabaseSetup();

// Step 1: Check if database exists
echo "Step 1: Checking database...\n";
$exists = $setup->databaseExists();

if ($exists) {
    echo "✓ Database already exists\n\n";
} else {
    echo "Database not found, creating...\n";
    if (!$setup->createDatabase()) {
        echo "Setup failed!\n";
        exit(1);
    }
    echo "\n";
}

// Step 2: Import SQL dump
echo "Step 2: Importing database structure and data...\n";
$sqlFile = __DIR__ . '/database_export_updated.sql';

if (!file_exists($sqlFile)) {
    echo "⚠ SQL dump file not found at: {$sqlFile}\n";
    echo "Looking for alternative location...\n";
    
    $alternatives = [
        __DIR__ . '/database_export.sql',
        __DIR__ . '/database_schema.sql',
        __DIR__ . '/backend/database_export_updated.sql',
    ];
    
    $sqlFile = null;
    foreach ($alternatives as $alt) {
        if (file_exists($alt)) {
            $sqlFile = $alt;
            echo "Found: {$alt}\n";
            break;
        }
    }
}

if (!$sqlFile || !file_exists($sqlFile)) {
    echo "❌ No SQL dump file found. Please ensure database_export_updated.sql exists.\n";
    exit(1);
}

if (!$setup->importSqlFile($sqlFile)) {
    echo "❌ Import failed!\n";
    exit(1);
}

echo "\n";

// Step 3: Verify
echo "Step 3: Verifying setup...\n";
if (!$setup->verify()) {
    echo "⚠ Verification issues found\n";
    // Don't exit, verification issues might be recoverable
}

echo "\n";
echo "================================\n";
echo "✓ Setup Complete!\n";
echo "================================\n";
echo "\nYou can now:\n";
echo "1. Backend:  cd backend && php artisan serve\n";
echo "2. Frontend: cd frontend && npm run dev\n\n";
