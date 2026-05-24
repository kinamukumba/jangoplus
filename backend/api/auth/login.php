<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Ajustar conforme porta do frontend
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();
require_once '../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email e password são obrigatórios']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Sucesso
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['display_name'] = $user['display_name'];
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'display_name' => $user['display_name']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciais inválidas']);
    }
}
