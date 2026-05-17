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
    $userAnswers = $data['answers'] ?? []; // Formato: { "1": "A", "2": "C" }

    if (!isset($_SESSION['active_simulado_gabarito'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Nenhum simulado ativo ou iniciado pelo Sekulo. Recarregue a página para gerar um novo.']);
        exit;
    }

    $gabarito = $_SESSION['active_simulado_gabarito'];
    $university = $_SESSION['active_simulado_university'] ?? 'Universidade de Angola';
    $course = $_SESSION['active_simulado_course'] ?? 'Curso Alvo';
    $category = $_SESSION['active_simulado_category'] ?? 'Geral';

    $totalQuestions = count($gabarito);
    $correctCount = 0;
    $detailedFeedback = [];
    $incorrectSubjects = [];

    // Avaliar as respostas
    foreach ($gabarito as $qId => $correctVal) {
        $userVal = isset($userAnswers[$qId]) ? trim(strtoupper($userAnswers[$qId])) : '';
        $isCorrect = ($userVal === $correctVal);
        if ($isCorrect) {
            $correctCount++;
        } else {
            $incorrectSubjects[] = "Questão " . $qId;
        }

        $detailedFeedback[$qId] = [
            'user_answer' => $userVal,
            'correct_answer' => $correctVal,
            'is_correct' => $isCorrect
        ];
    }

    $scorePercentage = ($correctCount / $totalQuestions) * 100;
    $passed = ($scorePercentage >= 70.0); // Nota de corte: 70% (7 de 10)

    try {
        $pdo->beginTransaction();

        // 1. Gravar a tentativa em exam_attempts
        $stmtAttempt = $pdo->prepare('
            INSERT INTO exam_attempts (user_id, score_percentage) 
            VALUES (?, ?)
        ');
        $stmtAttempt->execute([$userId, $scorePercentage]);

        $xpEarned = 0;
        $sekuloMessage = '';

        if ($passed) {
            $xpEarned = 500; // Super Recompensa de Simulado (+500 XP)

            // 2. Incrementar XP, Sequência (streak) e redefinir atraso na tabela user_stats
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
        }

        // 3. Obter Veredicto e conselhos do Sekulo
        $sekuloMessage = getSekuloVerdict($correctCount, $totalQuestions, $university, $course, $passed, $incorrectSubjects);

        $pdo->commit();

        // Limpar os dados do simulado ativo na sessão
        unset($_SESSION['active_simulado_gabarito']);
        unset($_SESSION['active_simulado_university']);
        unset($_SESSION['active_simulado_course']);
        unset($_SESSION['active_simulado_category']);

        echo json_encode([
            'success' => true,
            'passed' => $passed,
            'correct_count' => $correctCount,
            'total_questions' => $totalQuestions,
            'score_percentage' => $scorePercentage,
            'xp_earned' => $xpEarned,
            'sekulo_message' => $sekuloMessage,
            'feedback' => $detailedFeedback,
            'university' => $university,
            'specific_course' => $course
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno ao validar o simulado: ' . $e->getMessage()]);
    }
}

/**
 * Função para gerar o Veredicto Académico personalizado do Sekulo
 */
function getSekuloVerdict($correctCount, $totalQuestions, $university, $course, $passed, $incorrectSubjects) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? '';

    if (!empty($apiKey)) {
        $verdict = getGeminiVerdict($apiKey, $correctCount, $totalQuestions, $university, $course, $passed, $incorrectSubjects);
        if (!empty($verdict)) {
            return $verdict;
        }
    }

    return getDeterministicVerdict($correctCount, $university, $course);
}

/**
 * Gera veredicto dinâmico via Gemini 2.0 Flash
 */
function getGeminiVerdict($apiKey, $correctCount, $totalQuestions, $university, $course, $passed, $incorrectSubjects) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $apiKey;

    $incorrectList = implode(', ', $incorrectSubjects);
    $statusText = $passed ? "APROVADO (Acertou {$correctCount} de {$totalQuestions})" : "REPROVADO (Acertou {$correctCount} de {$totalQuestions})";

    $prompt = "Você é o 'Sekulo', o mestre severo, direto, sábio e profundamente focado da plataforma Jango+. Você avalia de forma ácida e realista a preparação de candidatos para os exames de admissão angolanos mais concorridos.
O utilizador acabou de realizar um simulado de exames para ingressar no curso de '{$course}' na universidade '{$university}'.
O resultado do aluno foi: {$statusText}.
Questões erradas: [{$incorrectList}].

Sua tarefa é escrever um parágrafo de veredicto acadêmico no tom do 'Sekulo'. Seja direto, sem rodeios e sincero. 
- Se ele passou (nota >= 7), elogie mas exija que não relaxe, ressaltando os deslizes que cometeu nas questões erradas.
- Se ele reprovou (nota < 7), seja extremamente severo, dizendo que com este nível ele seria triturado no exame de admissão da UAN/UCAN, exigindo foco total e dedicação diária.
Mantenha a resposta com no máximo 3 ou 4 frases curtas e afiadas. Não use markdown no texto.";

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($text)) {
            return trim($text);
        }
    }

    return null;
}

/**
 * Retorna veredicto determinístico premium baseado no número de acertos
 */
function getDeterministicVerdict($correctCount, $university, $course) {
    if ($correctCount === 10) {
        return "Notável! Acertaste 10 de 10. Tens uma base excecional para entrar em {$course} na {$university}. Mas o exame real é num pavilhão quente, sob pressão psicológica brutal. Não fiques convencido, continua a treinar diariamente!";
    } elseif ($correctCount >= 8) {
        return "Muito bom. Conseguiste {$correctCount}/10 e passaste no simulado do Sekulo. Mostras inteligência e foco para entrar em {$course}. No entanto, cometeste erros descuidados que na {$university} custar-te-iam a vaga dos teus sonhos. Corrige os teus pontos fracos agora!";
    } elseif ($correctCount === 7) {
        return "Passaste raspando! Fizeste exatamente 7/10. Na {$university}, estarias na lista de espera dos suplentes de {$course}, rezando para que alguém desistisse. O Sekulo não gosta de alunos medíocres que jogam com a sorte. Dobra a tua carga horária amanhã!";
    } elseif ($correctCount >= 5) {
        return "Reprovado! Com apenas {$correctCount}/10, a tua preparação para {$course} é completamente inadequada. No exame de acesso real da {$university}, serias eliminado logo na primeira fase sem qualquer hipótese. Queres mesmo ser um profissional ou estás apenas a brincar de estudar? Foco total!";
    } else {
        return "Um desastre absoluto! {$correctCount} acertos de 10? Isso é uma vergonha para o Jango! Se pensas que vais entrar na {$university} para estudar {$course} com este nível ridículo de conhecimento básico, acorda para a vida! Desliga as redes sociais, tranca-te no quarto e estuda o triplo!";
    }
}
