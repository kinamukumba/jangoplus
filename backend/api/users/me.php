<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];

$stmt = $pdo->prepare('
    SELECT u.id, u.email, u.phone, u.display_name, u.onboarded_at, u.is_active, u.role, s.xp_total, s.current_streak, s.delay_days, s.weekly_xp, s.league 
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
