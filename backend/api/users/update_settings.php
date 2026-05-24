<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $action = $data['action'] ?? ''; // 'profile' ou 'goals'

    try {
        $pdo->beginTransaction();

        if ($action === 'profile') {
            $displayName = trim($data['display_name'] ?? '');
            $newPassword = $data['password'] ?? '';

            if (empty($displayName)) {
                http_response_code(400);
                echo json_encode(['error' => 'O nome de exibição não pode ser vazio']);
                exit;
            }

            if (!empty($newPassword)) {
                if (strlen($newPassword) < 6) {
                    http_response_code(400);
                    echo json_encode(['error' => 'A senha deve ter pelo menos 6 caracteres']);
                    exit;
                }
                $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE users SET display_name = ?, password_hash = ? WHERE id = ?');
                $stmt->execute([$displayName, $passwordHash, $userId]);
            } else {
                $stmt = $pdo->prepare('UPDATE users SET display_name = ? WHERE id = ?');
                $stmt->execute([$displayName, $userId]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Perfil atualizado com sucesso!']);
            exit;

        } elseif ($action === 'goals') {
            $university = trim($data['university'] ?? '');
            $courseCategory = trim($data['course_category'] ?? '');
            $specificCourse = trim($data['specific_course'] ?? '');
            $studyHours = floatval($data['study_hours_day'] ?? 2.0);
            $motivation = trim($data['motivation'] ?? '');
            $regenerateRoadmap = isset($data['regenerate_roadmap']) && $data['regenerate_roadmap'] === true;

            if (empty($university) || empty($courseCategory) || empty($specificCourse)) {
                http_response_code(400);
                echo json_encode(['error' => 'Campos obrigatórios em falta (Universidade, Área ou Curso)']);
                exit;
            }

            // Atualizar na user_onboarding
            $stmt = $pdo->prepare('
                INSERT INTO user_onboarding (user_id, university, course_category, specific_course, study_hours_day, motivation)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    university = VALUES(university),
                    course_category = VALUES(course_category),
                    specific_course = VALUES(specific_course),
                    study_hours_day = VALUES(study_hours_day),
                    motivation = VALUES(motivation)
            ');
            $stmt->execute([$userId, $university, $courseCategory, $specificCourse, $studyHours, $motivation]);

            // Se solicitado, regeneramos o roadmap sequencial
            if ($regenerateRoadmap) {
                // Inclui a lógica do onboard.php para evitar duplicidade de escrita mas mantendo modular
                require_once 'onboard.php';
                $roadmapNodes = generateRoadmap($university, $courseCategory, $specificCourse, $studyHours, $motivation);

                // Limpar roadmap antigo
                $stmtDel = $pdo->prepare('DELETE FROM user_roadmap WHERE user_id = ?');
                $stmtDel->execute([$userId]);

                // Inserir os novos nós
                $stmtIns = $pdo->prepare('
                    INSERT INTO user_roadmap (user_id, subject, topic, description, order_num, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ');

                foreach ($roadmapNodes as $index => $node) {
                    $orderNum = $index + 1;
                    $status = ($orderNum === 1) ? 'available' : 'locked';
                    $stmtIns->execute([
                        $userId,
                        $node['subject'],
                        $node['topic'],
                        $node['description'],
                        $orderNum,
                        $status
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode([
                'success' => true, 
                'message' => $regenerateRoadmap ? 'Metas atualizadas e novo roadmap gerado pelo Sekulo!' : 'Metas académicas guardadas com sucesso!'
            ]);
            exit;
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Ação inválida especificada']);
            exit;
        }

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno ao atualizar configurações: ' . $e->getMessage()]);
    }
}
