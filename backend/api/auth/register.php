<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? null;
    if ($phone === '') $phone = null;
    $password = $data['password'] ?? '';
    $name = $data['name'] ?? '';

    if (empty($email) && empty($phone)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email ou Nº de Telefone é obrigatório']);
        exit;
    }
    if (empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'A palavra-passe é obrigatória']);
        exit;
    }
    
    // Verificar se email já existe
    if (!empty($email)) {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Este email já está em uso']);
            exit;
        }
    }

    // Verificar se telefone já existe
    if (!empty($phone)) {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE phone = ?');
        $stmt->execute([$phone]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Este número de telefone já está em uso']);
            exit;
        }
    }
    
    if (empty($name)) {
        $name = !empty($email) ? explode('@', $email)[0] : 'Estudante';
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO users (email, phone, password_hash, display_name) VALUES (?, ?, ?, ?)');
    if ($stmt->execute([$email, $phone, $hash, $name])) {
        $userId = $pdo->lastInsertId();
        
        // Auto-login após o registro
        $_SESSION['user_id'] = $userId;
        $_SESSION['display_name'] = $name;
        $_SESSION['role'] = 'user';

        echo json_encode([
            'success' => true,
            'user' => [
                'id'           => $userId,
                'email'        => $email,
                'phone'        => $phone,
                'display_name' => $name,
                'role'         => 'user',
                'is_active'    => 0,
                'onboarded_at' => null
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar utilizador']);
    }
}
