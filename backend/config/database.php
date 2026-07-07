<?php
require_once __DIR__ . '/env.php';

// Detectar ambiente automaticamente
$isLocalhost = (
    isset($_SERVER['SERVER_NAME']) && (
        $_SERVER['SERVER_NAME'] === 'localhost' ||
        $_SERVER['SERVER_NAME'] === '127.0.0.1'
    )
) || (
    isset($_SERVER['HTTP_HOST']) && (
        str_starts_with($_SERVER['HTTP_HOST'], 'localhost') ||
        str_starts_with($_SERVER['HTTP_HOST'], '127.0.0.1')
    )
);

// Credenciais: lê do .env primeiro, senão usa defaults correctos para o ambiente
if ($isLocalhost) {
    // XAMPP local — valores padrão para desenvolvimento
    $host    = $_ENV['DB_HOST'] ?? '127.0.0.1';
    $db      = $_ENV['DB_NAME'] ?? 'jangoplus';
    $user    = $_ENV['DB_USER'] ?? 'root';
    $pass    = $_ENV['DB_PASS'] ?? '';
} else {
    // Produção — obrigatoriamente usa o .env
    $host    = $_ENV['DB_HOST'] ?? '';
    $db      = $_ENV['DB_NAME'] ?? 'plucian1_jango';
    $user    = $_ENV['DB_USER'] ?? 'plucian1_jango_user';
    $pass    = $_ENV['DB_PASS'] ?? 'i}dUYu0!B-7=d$p%';
}

$charset = 'utf8mb4';
$dsn     = "mysql:host=$host;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Em desenvolvimento, mostrar detalhes do erro para facilitar debugging
    if ($isLocalhost) {
        echo json_encode([
            'error'   => 'Falha na ligação à base de dados (desenvolvimento)',
            'details' => $e->getMessage(),
            'config'  => "host=$host | db=$db | user=$user"
        ]);
    } else {
        echo json_encode(['error' => 'Database connection failed']);
    }
    exit;
}
