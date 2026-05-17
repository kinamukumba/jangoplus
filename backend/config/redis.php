<?php
require_once __DIR__ . '/env.php';

// Configuração do Redis (Presume uso da extensão PECL Redis nativa)
$redis = new Redis();
try {
    $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
    $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
    $redisPass = $_ENV['REDIS_PASS'] ?? '';

    $redis->connect($redisHost, $redisPort);
    
    if (!empty($redisPass)) {
        $redis->auth($redisPass);
    }
} catch (Exception $e) {
    // Em produção não exibir detalhes
    // echo json_encode(['error' => 'Redis connection failed']);
    // Fallback gracioso pode ser implementado se Redis cair
}

