<?php

$host = '127.0.0.1';
$dbname = 'personal_finance';
$username = 'root';
$password = '';
$outputFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'database_export.sql';

try {
    $pdo = new PDO("mysql:host={$host};dbname={$dbname};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    ]);

    $pdo->exec('SET NAMES utf8mb4');

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM);
    $tableNames = array_map(static fn($row) => $row[0], $tables);

    $sql = "-- Database export generated on " . date('Y-m-d H:i:s') . PHP_EOL;
    $sql .= "-- Database: {$dbname}" . PHP_EOL . PHP_EOL;
    $sql .= "SET NAMES utf8mb4;" . PHP_EOL;
    $sql .= "SET FOREIGN_KEY_CHECKS=0;" . PHP_EOL . PHP_EOL;

    foreach ($tableNames as $table) {
        $sql .= "DROP TABLE IF EXISTS `{$table}`;" . PHP_EOL;
        $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
        $createSql = $createStmt['Create Table'] ?? array_values($createStmt)[1] ?? '';
        $sql .= $createSql . ";" . PHP_EOL . PHP_EOL;

        $rowsStmt = $pdo->query("SELECT * FROM `{$table}`");
        $columns = [];
        for ($i = 0; $i < $rowsStmt->columnCount(); $i++) {
            $meta = $rowsStmt->getColumnMeta($i);
            $columns[] = $meta['name'] ?? 'column_' . $i;
        }

        $insertRows = [];
        while ($row = $rowsStmt->fetch(PDO::FETCH_ASSOC)) {
            $values = [];
            foreach ($columns as $column) {
                if (!array_key_exists($column, $row) || $row[$column] === null) {
                    $values[] = 'NULL';
                    continue;
                }

                $value = $row[$column];
                if (is_bool($value)) {
                    $values[] = $value ? '1' : '0';
                } elseif (is_numeric($value) && !preg_match('/^0\d+/', (string) $value)) {
                    $values[] = (string) $value;
                } else {
                    $values[] = $pdo->quote((string) $value);
                }
            }
            $insertRows[] = '(' . implode(', ', $values) . ')';
        }

        if ($insertRows !== []) {
            $sql .= "INSERT INTO `{$table}` (`" . implode('`, `', $columns) . "`) VALUES" . PHP_EOL;
            $sql .= implode(',' . PHP_EOL, $insertRows) . ";" . PHP_EOL . PHP_EOL;
        }
    }

    $sql .= "SET FOREIGN_KEY_CHECKS=1;" . PHP_EOL;

    file_put_contents($outputFile, $sql);
    echo "Exported to: {$outputFile}" . PHP_EOL;
    echo "Tables exported: " . count($tableNames) . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, "Export failed: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
