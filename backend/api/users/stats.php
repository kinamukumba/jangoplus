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
    // 1. Contar módulos concluídos e totais do roadmap
    $stmtRoadmap = $pdo->prepare('
        SELECT 
            SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_modules,
            COUNT(*) as total_modules
        FROM user_roadmap 
        WHERE user_id = ?
    ');
    $stmtRoadmap->execute([$userId]);
    $roadmapStats = $stmtRoadmap->fetch();

    $completedModules = intval($roadmapStats['completed_modules'] ?? 0);
    $totalModules = intval($roadmapStats['total_modules'] ?? 0);

    // 2. Estatísticas de tentativas de simulados / quizzes
    $stmtAttempts = $pdo->prepare('
        SELECT 
            AVG(score_percentage) as accuracy_rate,
            COUNT(*) as total_quizzes
        FROM exam_attempts 
        WHERE user_id = ?
    ');
    $stmtAttempts->execute([$userId]);
    $attemptStats = $stmtAttempts->fetch();

    $accuracyRate = $attemptStats['accuracy_rate'] !== null ? floatval($attemptStats['accuracy_rate']) : 0.0;
    $totalQuizzes = intval($attemptStats['total_quizzes'] ?? 0);

    // 3. Obter dados de onboarding (Metas Académicas)
    $stmtOnboarding = $pdo->prepare('
        SELECT university, course_category, specific_course, study_hours_day, motivation 
        FROM user_onboarding 
        WHERE user_id = ?
    ');
    $stmtOnboarding->execute([$userId]);
    $onboarding = $stmtOnboarding->fetch();

    echo json_encode([
        'success' => true,
        'stats' => [
            'completed_modules' => $completedModules,
            'total_modules' => $totalModules,
            'accuracy_rate' => round($accuracyRate, 1),
            'total_quizzes' => $totalQuizzes,
            'university' => $onboarding['university'] ?? 'Não definida',
            'course_category' => $onboarding['course_category'] ?? 'Não definida',
            'specific_course' => $onboarding['specific_course'] ?? 'Não definido',
            'study_hours_day' => floatval($onboarding['study_hours_day'] ?? 2.0),
            'motivation' => $onboarding['motivation'] ?? ''
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao consultar estatísticas: ' . $e->getMessage()]);
}
