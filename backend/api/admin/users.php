<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Verificação de Autenticação e Autorização (Admin)
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

$stmtAdmin = $pdo->prepare('SELECT role FROM users WHERE id = ?');
$stmtAdmin->execute([$_SESSION['user_id']]);
$adminRole = $stmtAdmin->fetchColumn();

if ($adminRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado. Apenas administradores têm permissão.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Listar todos os utilizadores
    try {
        $search = $_GET['search'] ?? '';
        
        $query = '
            SELECT u.id, u.email, u.phone, u.display_name, u.is_active, u.role, u.onboarded_at, u.created_at,
                   s.xp_total, s.current_streak, s.league 
            FROM users u
            LEFT JOIN user_stats s ON u.id = s.user_id
        ';
        
        if (!empty($search)) {
            $query .= ' WHERE u.display_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?';
            $stmt = $pdo->prepare($query);
            $like = "%$search%";
            $stmt->execute([$like, $like, $like]);
        } else {
            $stmt = $pdo->query($query);
        }
        
        $users = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'users' => $users
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao listar utilizadores: ' . $e->getMessage()]);
    }
}

elseif ($method === 'POST') {
    // Editar, Desativar ou Gerar Link de Ativação
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    $targetUserId = intval($data['user_id'] ?? 0);
    
    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Utilizador alvo inválido']);
        exit;
    }
    
    try {
        if ($action === 'update') {
            $name = $data['display_name'] ?? '';
            $email = $data['email'] ?? '';
            $phone = $data['phone'] ?? '';
            $role = $data['role'] ?? 'user';
            $is_active = intval($data['is_active'] ?? 0);
            
            if (empty($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'E-mail é obrigatório']);
                exit;
            }
            
            $stmt = $pdo->prepare('
                UPDATE users 
                SET display_name = ?, email = ?, phone = ?, role = ?, is_active = ?
                WHERE id = ?
            ');
            $stmt->execute([$name, $email, $phone, $role, $is_active, $targetUserId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Utilizador atualizado com sucesso!'
            ]);
        }
        
        elseif ($action === 'toggle_active') {
            // Alternar estado de ativação
            $stmtGet = $pdo->prepare('SELECT is_active FROM users WHERE id = ?');
            $stmtGet->execute([$targetUserId]);
            $currentStatus = intval($stmtGet->fetchColumn());
            
            $newStatus = $currentStatus === 1 ? 0 : 1;
            
            $stmt = $pdo->prepare('UPDATE users SET is_active = ? WHERE id = ?');
            $stmt->execute([$newStatus, $targetUserId]);
            
            echo json_encode([
                'success' => true,
                'is_active' => $newStatus,
                'message' => $newStatus === 1 ? 'Conta ativada com sucesso!' : 'Conta desativada com sucesso!'
            ]);
        }
        
        elseif ($action === 'generate_link') {
            // Gerar token de activação
            $token = bin2hex(random_bytes(16));
            
            $stmt = $pdo->prepare('UPDATE users SET activation_token = ? WHERE id = ?');
            $stmt->execute([$token, $targetUserId]);
            
            // Construir link de ativação
            $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
            $pathSegments = explode('/', $_SERVER['REQUEST_URI']);
            // A rota deste arquivo é /backend/api/admin/users.php, então o link final é /backend/api/auth/activate.php
            $jangoIndex = array_search('jangoplus', $pathSegments);
            $basePath = $jangoIndex !== false ? '/' . implode('/', array_slice($pathSegments, 1, $jangoIndex + 1)) . '/' : '/';
            
            $link = $baseUrl . $basePath . "backend/api/auth/activate.php?token=" . $token;
            
            echo json_encode([
                'success' => true,
                'activation_link' => $link
            ]);
        }
        
        elseif ($action === 'delete') {
            // Excluir utilizador
            $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$targetUserId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Utilizador excluído com sucesso!'
            ]);
        }
        
        else {
            http_response_code(400);
            echo json_encode(['error' => 'Ação inválida']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao processar ação: ' . $e->getMessage()]);
    }
}
?>
