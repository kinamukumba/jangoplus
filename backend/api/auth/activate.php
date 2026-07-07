<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo "<h1>Token de activação inválido ou ausente.</h1>";
    exit;
}

try {
    // Buscar utilizador com o token de activação
    $stmt = $pdo->prepare('SELECT id, display_name FROM users WHERE activation_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(400);
        echo "<h1>Token de activação expirado ou inválido.</h1>";
        exit;
    }

    // Activar utilizador
    $stmtUpdate = $pdo->prepare('UPDATE users SET is_active = 1, activation_token = NULL WHERE id = ?');
    $stmtUpdate->execute([$user['id']]);

    // Redirecionar para o login com mensagem de sucesso
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    // Extrair base path da URL
    $pathSegments = explode('/', $_SERVER['REQUEST_URI']);
    $jangoIndex = array_search('jangoplus', $pathSegments);
    $basePath = $jangoIndex !== false ? '/' . implode('/', array_slice($pathSegments, 1, $jangoIndex + 1)) . '/' : '/';
    
    header("Location: " . $baseUrl . $basePath . "index.html?activated=true");
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo "<h1>Erro interno ao activar conta: " . $e->getMessage() . "</h1>";
}
