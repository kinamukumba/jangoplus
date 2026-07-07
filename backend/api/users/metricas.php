<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];
$today  = date('Y-m-d');
$week   = date('Y-m-d', strtotime('-6 days'));
$month  = date('Y-m-d', strtotime('-29 days'));

try {
    // ── Bloco 1 — Core ──────────────────────────────────────────────────────
    // Dias activos nos últimos 30 dias
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_sessions WHERE user_id=? AND session_date >= ?");
    $stmt->execute([$userId, $month]);
    $activeDays30 = (int)$stmt->fetchColumn();

    // Dias activos há 7 dias (D7 retention proxy)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_sessions WHERE user_id=? AND session_date >= ?");
    $stmt->execute([$userId, $week]);
    $activeDays7 = (int)$stmt->fetchColumn();

    $retentionD7 = $activeDays7 >= 3 ? 'activo' : ($activeDays7 >= 1 ? 'em_risco' : 'inactivo');

    // Churn flag: sem actividade nos últimos 7 dias?
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_sessions WHERE user_id=? AND session_date >= ?");
    $stmt->execute([$userId, $week]);
    $churn = (int)$stmt->fetchColumn() === 0;

    // Registar sessão de hoje automaticamente
    $pdo->prepare("INSERT IGNORE INTO user_sessions (user_id, session_date) VALUES (?, ?)")
        ->execute([$userId, $today]);

    // ── Bloco 2 — Engagement ────────────────────────────────────────────────
    // Streak actual
    $stmt = $pdo->prepare("SELECT current_streak, weekly_xp FROM user_stats WHERE user_id=?");
    $stmt->execute([$userId]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    $streak = (int)($stats['current_streak'] ?? 0);

    // Missões completadas nos últimos 7 dias
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM daily_missions WHERE user_id=? AND status='completed' AND mission_date >= ?");
    $stmt->execute([$userId, $week]);
    $missionsCompleted7 = (int)$stmt->fetchColumn();
    $missionsPerDay = round($missionsCompleted7 / 7, 1);

    // Tempo médio diário (minutos)
    $stmt = $pdo->prepare("SELECT AVG(duration_minutes) FROM user_sessions WHERE user_id=? AND session_date >= ?");
    $stmt->execute([$userId, $week]);
    $avgTime = (float)($stmt->fetchColumn() ?? 0);

    // Frequência semanal (dias com actividade esta semana)
    $weeklyFreq = $activeDays7;

    // ── Bloco 3 — Aprendizado ────────────────────────────────────────────────
    // Evolução dos simulados (últimos 5)
    $stmt = $pdo->prepare("SELECT score_percentage, weak_subjects, correct_count, completed_at FROM exam_attempts WHERE user_id=? ORDER BY completed_at DESC LIMIT 8");
    $stmt->execute([$userId]);
    $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $simuladoEvolution = array_reverse(array_map(fn($e) => [
        'score'   => (float)$e['score_percentage'],
        'correct' => (int)$e['correct_count'],
        'date'    => $e['completed_at'],
    ], $exams));

    // Disciplinas fracas (contagem de erros acumulados)
    $weakCount = [];
    foreach ($exams as $e) {
        if (!empty($e['weak_subjects'])) {
            $subjects = json_decode($e['weak_subjects'], true) ?? [];
            foreach ($subjects as $s) {
                $weakCount[$s] = ($weakCount[$s] ?? 0) + 1;
            }
        }
    }
    arsort($weakCount);
    $weakDisciplines = array_keys(array_slice($weakCount, 0, 3, true));

    // Taxa de acerto global (todos os simulados)
    $stmt = $pdo->prepare("SELECT AVG(score_percentage) FROM exam_attempts WHERE user_id=?");
    $stmt->execute([$userId]);
    $globalAccuracy = round((float)($stmt->fetchColumn() ?? 0), 1);

    // ── Bloco 4 — Alertas ────────────────────────────────────────────────────
    $alerts = [];

    if ($churn) {
        $alerts[] = ['type' => 'danger', 'icon' => '🚨', 'message' => 'Sem actividade há mais de 7 dias. O teu ritmo quebrou.'];
    } elseif ($retentionD7 === 'em_risco') {
        $alerts[] = ['type' => 'warning', 'icon' => '⚠️', 'message' => 'Actividade baixa esta semana. O Sekulo está de olho.'];
    }

    if ($streak === 0) {
        $alerts[] = ['type' => 'danger', 'icon' => '💀', 'message' => 'A tua sequência está zerada. Completa uma missão hoje.'];
    } elseif ($streak < 3) {
        $alerts[] = ['type' => 'warning', 'icon' => '🔥', 'message' => 'Sequência fraca. Mantém o ritmo para não perder tudo.'];
    }

    if (count($exams) >= 2) {
        $last  = (float)$exams[0]['score_percentage'];
        $prev  = (float)$exams[1]['score_percentage'];
        if ($last < $prev - 15) {
            $alerts[] = ['type' => 'warning', 'icon' => '📉', 'message' => "Queda de desempenho: {$prev}% → {$last}% no último simulado."];
        }
    }

    if ($missionsPerDay < 0.5) {
        $alerts[] = ['type' => 'warning', 'icon' => '📚', 'message' => 'Menos de 1 missão por cada 2 dias. Tens de estudar mais.'];
    }

    // ── Bloco 5 — Progresso Global ───────────────────────────────────────────
    $stmt = $pdo->prepare("SELECT xp_total, league FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $xpTotal = (int)($userRow['xp_total'] ?? 0);
    $league  = $userRow['league'] ?? 'bronze';

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM daily_missions WHERE user_id=? AND status='completed'");
    $stmt->execute([$userId]);
    $totalMissionsAllTime = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM exam_attempts WHERE user_id=?");
    $stmt->execute([$userId]);
    $totalSimuladosAllTime = (int)$stmt->fetchColumn();

    // ── Recomendações personalizadas baseadas nas disciplinas fracas ─────────
    $recommendations = [];
    $disciplineAdvice = [
        'Matemática'       => 'Foca em Funções, Geometria e Cálculo Diferencial. Faz pelo menos 10 exercícios por dia.',
        'Física'           => 'Revê Mecânica e Termodinâmica. Aprende as fórmulas de cor e pratica com problemas numéricos.',
        'Biologia'         => 'Estuda Citologia e Genética com profundidade. Usa mapas mentais para memorizar ciclos.',
        'Química'          => 'Concentra-te em Estequiometria e Ligações Químicas. Faz as reações mais comuns repetidamente.',
        'História'         => 'Cria uma linha do tempo dos eventos mais importantes. Relaciona causas e consequências.',
        'Geografia'        => 'Aprende os mapas de Angola e África. Foca em climatologia e recursos naturais.',
        'Língua Portuguesa'=> 'Lê textos e identifica figuras de linguagem. Pratica a gramática com exercícios escritos.',
    ];
    foreach ($weakDisciplines as $disc) {
        $recommendations[] = [
            'discipline' => $disc,
            'advice'     => $disciplineAdvice[$disc] ?? "Dedica mais tempo ao estudo de {$disc} e completa simulados focados nessa disciplina.",
        ];
    }

    echo json_encode([
        'success' => true,
        'core' => [
            'active_days_30' => $activeDays30,
            'active_days_7'  => $activeDays7,
            'retention_d7'   => $retentionD7,
            'churn'          => $churn,
        ],
        'engagement' => [
            'streak'            => $streak,
            'missions_per_day'  => $missionsPerDay,
            'avg_daily_minutes' => round($avgTime),
            'weekly_frequency'  => $weeklyFreq,
            'weekly_xp'         => (int)($stats['weekly_xp'] ?? 0),
        ],
        'learning' => [
            'simulado_evolution'    => $simuladoEvolution,
            'weak_disciplines'      => $weakDisciplines,
            'global_accuracy'       => $globalAccuracy,
            'total_simulados'       => count($exams),
        ],
        'progress' => [
            'xp_total'              => $xpTotal,
            'league'                => $league,
            'total_missions'        => $totalMissionsAllTime,
            'total_simulados'       => $totalSimuladosAllTime,
        ],
        'recommendations' => $recommendations,
        'alerts'          => $alerts,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
}
