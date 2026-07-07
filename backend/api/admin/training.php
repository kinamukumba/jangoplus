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
    // Listar todos os materiais de treino
    try {
        $search = $_GET['search'] ?? '';
        $course = $_GET['course_category'] ?? '';
        
        $query = 'SELECT id, course_category, specific_course, topic, content, created_at FROM sekulo_training';
        $params = [];
        
        $conditions = [];
        if (!empty($search)) {
            $conditions[] = '(topic LIKE ? OR content LIKE ? OR specific_course LIKE ?)';
            $like = "%$search%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if (!empty($course)) {
            $conditions[] = 'course_category = ?';
            $params[] = $course;
        }
        
        if (count($conditions) > 0) {
            $query .= ' WHERE ' . implode(' AND ', $conditions);
        }
        
        $query .= ' ORDER BY course_category ASC, specific_course ASC, topic ASC';
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $materials = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'materials' => $materials
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao listar materiais de treino: ' . $e->getMessage()]);
    }
}

elseif ($method === 'POST') {
    // Adicionar, Editar ou Excluir
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    $id = intval($data['id'] ?? 0);
    
    try {
        if ($action === 'save') {
            $category = $data['course_category'] ?? '';
            $specificCourse = $data['specific_course'] ?? '';
            $topic = $data['topic'] ?? '';
            $content = $data['content'] ?? '';
            
            if (empty($category) || empty($specificCourse) || empty($topic) || empty($content)) {
                http_response_code(400);
                echo json_encode(['error' => 'Todos os campos são obrigatórios']);
                exit;
            }
            
            if ($id > 0) {
                // Editar
                $stmt = $pdo->prepare('
                    UPDATE sekulo_training 
                    SET course_category = ?, specific_course = ?, topic = ?, content = ?
                    WHERE id = ?
                ');
                $stmt->execute([$category, $specificCourse, $topic, $content, $id]);
                $message = 'Conteúdo de treino atualizado com sucesso!';
            } else {
                // Adicionar
                $stmt = $pdo->prepare('
                    INSERT INTO sekulo_training (course_category, specific_course, topic, content)
                    VALUES (?, ?, ?, ?)
                ');
                $stmt->execute([$category, $specificCourse, $topic, $content]);
                $id = $pdo->lastInsertId();
                $message = 'Conteúdo de treino adicionado com sucesso!';
            }
            
            echo json_encode([
                'success' => true,
                'id' => $id,
                'message' => $message
            ]);
        }
        
        elseif ($action === 'delete') {
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'ID inválido para exclusão']);
                exit;
            }
            
            $stmt = $pdo->prepare('DELETE FROM sekulo_training WHERE id = ?');
            $stmt->execute([$id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Conteúdo de treino excluído com sucesso!'
            ]);
        }
        
        else {
            http_response_code(400);
            echo json_encode(['error' => 'Ação inválida']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao processar conteúdo: ' . $e->getMessage()]);
    }
}
?>
