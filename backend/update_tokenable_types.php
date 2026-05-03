<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$conn = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], $_ENV['DB_DATABASE'], (int)$_ENV['DB_PORT']);
if ($conn->connect_error) { die('Conn error: '.$conn->connect_error); }

// Show before
$res = $conn->query("SELECT tokenable_type, COUNT(*) as cnt FROM personal_access_tokens GROUP BY tokenable_type");
while ($r = $res->fetch_assoc()) { echo "Before: {$r['tokenable_type']} => {$r['cnt']}\n"; }

// Perform update
$target = 'App\\\\Models\\\\User'; // PHP string becomes App\\Models\\User -> SQL literal App\Models\User
$sql = "UPDATE personal_access_tokens SET tokenable_type = 'App\\\\Models\\\\User' WHERE tokenable_type = 'AppModelsUser'";
if ($conn->query($sql) === TRUE) {
    echo "\nUpdated rows: " . $conn->affected_rows . "\n";
} else {
    echo "Error updating: " . $conn->error . "\n";
}

// Show after
$res = $conn->query("SELECT tokenable_type, COUNT(*) as cnt FROM personal_access_tokens GROUP BY tokenable_type");
while ($r = $res->fetch_assoc()) { echo "After: {$r['tokenable_type']} => {$r['cnt']}\n"; }

$conn->close();
