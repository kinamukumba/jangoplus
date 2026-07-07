<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $loginIdentifier = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($loginIdentifier) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email/Telefone e password são obrigatórios']);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT id, email, phone, password_hash, display_name, role, is_active, onboarded_at
         FROM users 
         WHERE email = ? OR phone = ?'
    );
    $stmt->execute([$loginIdentifier, $loginIdentifier]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Iniciar sessão autenticada
        $_SESSION['user_id']      = $user['id'];
        $_SESSION['display_name'] = $user['display_name'];
        $_SESSION['role']         = $user['role'];
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id'           => $user['id'],
                'email'        => $user['email'],
                'phone'        => $user['phone'],
                'display_name' => $user['display_name'],
                'role'         => $user['role'],
                'is_active'    => (int)$user['is_active'],
                'onboarded_at' => $user['onboarded_at'],
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciais inválidas. Verifique o seu email/telefone e a palavra-passe.']);
    }
}
