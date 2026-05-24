<?php
require_once __DIR__ . '/env.php';

// Configurações do Banco de Dados via .env
$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$db   = $_ENV['DB_NAME'] ?? 'plucian1_jango';
$user = $_ENV['DB_USER'] ?? 'plucian1_jango_user';
$pass = $_ENV['DB_PASS'] ?? 'i}dUYu0!B-7=d$p%';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Em produção não exibir detalhes do erro
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

