<?php
// Script temporário de diagnóstico da BD — remover após uso
require_once __DIR__ . '/config/database.php';

try {
    // Mostrar todas as colunas da tabela users
    $stmt = $pdo->query("DESCRIBE users");
    $cols = $stmt->fetchAll();
    echo "=== TABELA: users ===\n";
    foreach ($cols as $c) {
        echo "  {$c['Field']} | {$c['Type']} | Default: {$c['Default']} | Null: {$c['Null']}\n";
    }

    echo "\n=== TABELA: user_stats ===\n";
    $stmt = $pdo->query("DESCRIBE user_stats");
    $cols = $stmt->fetchAll();
    foreach ($cols as $c) {
        echo "  {$c['Field']} | {$c['Type']} | Default: {$c['Default']} | Null: {$c['Null']}\n";
    }

    echo "\n=== TABELA: sekulo_training ===\n";
    $stmt = $pdo->query("DESCRIBE sekulo_training");
    $cols = $stmt->fetchAll();
    foreach ($cols as $c) {
        echo "  {$c['Field']} | {$c['Type']} | Default: {$c['Default']} | Null: {$c['Null']}\n";
    }

    echo "\n=== TODAS AS TABELAS ===\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        echo "  - $t\n";
    }

} catch (Exception $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
}
