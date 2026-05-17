<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
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
    $userAnswers = $data['answers'] ?? []; // Formato: { "1": "A", "2": "B", "3": "C" }

    if (!isset($_SESSION['quiz_answers']) || !isset($_SESSION['quiz_topic_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Nenhuma sessão de quiz ativa iniciada pelo Sekulo']);
        exit;
    }

    $correctAnswers = $_SESSION['quiz_answers'];
    $activeTopicId = $_SESSION['quiz_topic_id'];
    $orderNum = $_SESSION['quiz_order_num'];

    $totalQuestions = count($correctAnswers);
    $correctCount = 0;
    $detailedFeedback = [];

    foreach ($correctAnswers as $qid => $correctVal) {
        $userVal = isset($userAnswers[$qid]) ? trim(strtoupper($userAnswers[$qid])) : '';
        $isCorrect = ($userVal === $correctVal);
        if ($isCorrect) {
            $correctCount++;
        }
        $detailedFeedback[$qid] = [
            'user_answer' => $userVal,
            'correct_answer' => $correctVal,
            'is_correct' => $isCorrect
        ];
    }

    $scorePercentage = ($correctCount / $totalQuestions) * 100;
    $passed = ($scorePercentage >= 66.0); // Pelo menos 2 acertos de 3

    try {
        $pdo->beginTransaction();

        // 1. Gravar a tentativa em exam_attempts
        $stmtAttempt = $pdo->prepare('
            INSERT INTO exam_attempts (user_id, score_percentage) 
            VALUES (?, ?)
        ');
        $stmtAttempt->execute([$userId, $scorePercentage]);

        $xpEarned = 0;
        $unlockedNext = false;
        $nextTopicName = '';
        $sekuloMessage = '';

        if ($passed) {
            $xpEarned = 150; // XP atribuído por passar na missão

            // 2. Marcar o módulo/tópico atual como 'completed'
            $stmtUpdateRoadmap = $pdo->prepare('
                UPDATE user_roadmap 
                SET status = "completed" 
                WHERE id = ? AND user_id = ?
            ');
            $stmtUpdateRoadmap->execute([$activeTopicId, $userId]);

            // 3. Desbloquear o próximo módulo (se existir)
            $stmtNext = $pdo->prepare('
                SELECT id, topic 
                FROM user_roadmap 
                WHERE user_id = ? AND order_num = ?
                LIMIT 1
            ');
            $stmtNext->execute([$userId, $orderNum + 1]);
            $nextTopic = $stmtNext->fetch();

            if ($nextTopic) {
                $stmtUnlock = $pdo->prepare('
                    UPDATE user_roadmap 
                    SET status = "available" 
                    WHERE id = ?
                ');
                $stmtUnlock->execute([$nextTopic['id']]);
                $unlockedNext = true;
                $nextTopicName = $nextTopic['topic'];
            }

            // 4. Incrementar XP, Sequência (streak) e redefinir atraso do utilizador
            $stmtStats = $pdo->prepare('
                UPDATE user_stats 
                SET xp_total = xp_total + ?,
                    weekly_xp = weekly_xp + ?,
                    current_streak = current_streak + 1,
                    delay_days = 0
                WHERE user_id = ?
            ');
            $stmtStats->execute([$xpEarned, $xpEarned, $userId]);

            // Atualizar liga dinamicamente com base no novo XP total
            $stmtXp = $pdo->prepare('SELECT xp_total FROM user_stats WHERE user_id = ?');
            $stmtXp->execute([$userId]);
            $newXpTotal = $stmtXp->fetch()['xp_total'];

            $league = 'bronze';
            if ($newXpTotal >= 3000) {
                $league = 'ouro';
            } elseif ($newXpTotal >= 1000) {
                $league = 'prata';
            }

            $stmtLeague = $pdo->prepare('UPDATE user_stats SET league = ? WHERE user_id = ?');
            $stmtLeague->execute([$league, $userId]);

            // Mensagem do Sekulo
            $msgs = [
                "Excelente. Mostraste foco. Mas não te acomodes, amanhã há mais.",
                "Aceitável. Pelo menos não me fizeste perder tempo hoje.",
                "Bom trabalho! Vês o que a consistência faz? Continua assim."
            ];
            $sekuloMessage = $msgs[array_rand($msgs)];

            // Limpar sessão do quiz atual já que foi concluído com sucesso
            unset($_SESSION['quiz_answers']);
            unset($_SESSION['quiz_topic_id']);
            unset($_SESSION['quiz_order_num']);

        } else {
            // Se falhar
            $msgsFail = [
                "Inadmissível! Estuda mais ou o exame de acesso vai destruir os teus sonhos.",
                "Errar é humano, mas errar coisas básicas no vestibular é amadorismo. Tenta outra vez.",
                "Achas que a UAN aprova curiosos? Volta a estudar o módulo e tenta de novo."
            ];
            $sekuloMessage = $msgsFail[array_rand($msgsFail)];
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'passed' => $passed,
            'correct_count' => $correctCount,
            'total_questions' => $totalQuestions,
            'score_percentage' => $scorePercentage,
            'xp_earned' => $xpEarned,
            'unlocked_next' => $unlockedNext,
            'next_topic' => $nextTopicName,
            'sekulo_message' => $sekuloMessage,
            'feedback' => $detailedFeedback
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno ao validar quiz: ' . $e->getMessage()]);
    }
}
