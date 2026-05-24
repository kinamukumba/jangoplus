<?php
// cors.php - Configuração de CORS e Inicialização da Sessão
header('Content-Type: application/json');

// Permitir origens confiáveis
$allowed_origins = [
    'https://jangoplus.vercel.app',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allow = false;
if (in_array($origin, $allowed_origins)) {
    $allow = true;
} elseif (preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin)) {
    $allow = true;
} elseif (preg_match('/^https?:\/\/127\.0\.0\.1(:\d+)?$/', $origin)) {
    $allow = true;
} elseif (preg_match('/^https?:\/\/[a-zA-Z0-9-]+\.vercel\.app$/', $origin)) {
    $allow = true;
}

if ($allow) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Default fallback
    header("Access-Control-Allow-Origin: https://jangoplus.vercel.app");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Responder a preflights do CORS imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurar parâmetros do cookie da sessão para suportar HTTPS e SameSite=None
if (session_status() === PHP_SESSION_NONE) {
    // Determinar se estamos rodando em HTTPS (produção)
    $isSecure = false;
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        $isSecure = true;
    } elseif (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        $isSecure = true;
    }

    if ($isSecure) {
        // Em produção HTTPS, precisamos de SameSite=None e Secure para o cookie ser enviado do Vercel
        session_start([
            'cookie_lifetime' => 0,
            'cookie_path' => '/',
            'cookie_domain' => '',
            'cookie_secure' => true,
            'cookie_httponly' => true,
            'cookie_samesite' => 'None',
        ]);
    } else {
        // Em desenvolvimento local HTTP
        session_start([
            'cookie_lifetime' => 0,
            'cookie_path' => '/',
            'cookie_domain' => '',
            'cookie_secure' => false,
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }
}
