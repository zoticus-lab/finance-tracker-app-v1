<?php
require 'vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "Testing connection to {$_ENV['DB_HOST']}:{$_ENV['DB_PORT']}...\n";

$conn = @mysqli_connect(
    $_ENV['DB_HOST'],
    $_ENV['DB_USERNAME'],
    $_ENV['DB_PASSWORD'],
    '',
    (int)$_ENV['DB_PORT']
);

if (!$conn) {
    echo "❌ Connection failed: " . mysqli_connect_error() . "\n";
    exit(1);
}

echo "✅ Connected!\n\n";

// Test a simple query
if ($conn->query('SELECT VERSION() AS version')) {
    $result = $conn->query('SELECT VERSION() AS version');
    $row = $result->fetch_assoc();
    echo "MySQL Version: " . $row['version'] . "\n";
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

// List existing databases
echo "\nExisting databases:\n";
$result = $conn->query('SHOW DATABASES');
if ($result) {
    while ($row = $result->fetch_array(MYSQLI_NUM)) {
        echo "   - " . $row[0] . "\n";
    }
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

$conn->close();
