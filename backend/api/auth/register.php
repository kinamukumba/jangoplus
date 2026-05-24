<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $name = $data['name'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email e password são obrigatórios']);
        exit;
    }
    
    if (empty($name)) {
        $name = explode('@', $email)[0];
    }

    // Verificar se já existe
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Este email já está em uso']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)');
    if ($stmt->execute([$email, $hash, $name])) {
        $userId = $pdo->lastInsertId();
        
        // Auto-login após o registro
        $_SESSION['user_id'] = $userId;
        $_SESSION['display_name'] = $name;

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'display_name' => $name
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar usuário']);
    }
}
