<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];

// Buscar dados do usuário e stats (usando JOIN)
$stmt = $pdo->prepare('
    SELECT u.id, u.email, u.display_name, s.xp_total, s.current_streak, s.delay_days, s.weekly_xp, s.league 
    FROM users u 
    LEFT JOIN user_stats s ON u.id = s.user_id 
    WHERE u.id = ?
');
$stmt->execute([$userId]);
$userData = $stmt->fetch();

if ($userData) {
    echo json_encode([
        'success' => true,
        'user' => $userData
    ]);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Usuário não encontrado']);
}
