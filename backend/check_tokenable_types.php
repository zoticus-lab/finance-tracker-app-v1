<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$conn = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], $_ENV['DB_DATABASE'], (int)$_ENV['DB_PORT']);
if ($conn->connect_error) { die('Conn error: '.$conn->connect_error); }

$result = $conn->query('SELECT DISTINCT tokenable_type, COUNT(*) as cnt FROM personal_access_tokens GROUP BY tokenable_type');
if (!$result) { echo 'Error: '.$conn->error; exit(1); }

while ($row = $result->fetch_assoc()) {
    echo $row['tokenable_type'].' — '.$row['cnt']."\n";
}

$conn->close();
