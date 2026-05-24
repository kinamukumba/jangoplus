<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
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

try {
    // Buscar todos os nós do roadmap em ordem
    $stmt = $pdo->prepare('
        SELECT id, subject, topic, description, order_num, status 
        FROM user_roadmap 
        WHERE user_id = ? 
        ORDER BY order_num ASC
    ');
    $stmt->execute([$userId]);
    $roadmap = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'roadmap' => $roadmap
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao consultar o roadmap: ' . $e->getMessage()]);
}
