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

    $university = $data['university'] ?? '';
    $courseCategory = $data['course_category'] ?? ''; // 'Engenharia', 'Saude', 'Sociais', 'Economicas'
    $specificCourse = $data['specific_course'] ?? '';
    $studyHours = floatval($data['study_hours_day'] ?? 2.0);
    $motivation = $data['motivation'] ?? '';

    if (empty($university) || empty($courseCategory) || empty($specificCourse)) {
        http_response_code(400);
        echo json_encode(['error' => 'Universidade, área de estudos e curso específico são obrigatórios']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Gravar/atualizar dados na user_onboarding
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

        // 2. Atualizar users.onboarded_at
        $stmt = $pdo->prepare('UPDATE users SET onboarded_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$userId]);

        // 3. Gerar o Roadmap (Gemini API ou Fallback Determinístico)
        $roadmapNodes = generateRoadmap($university, $courseCategory, $specificCourse, $studyHours, $motivation);

        // 4. Limpar roadmap antigo se houver
        $stmt = $pdo->prepare('DELETE FROM user_roadmap WHERE user_id = ?');
        $stmt->execute([$userId]);

        // 5. Inserir o novo roadmap gerado
        $stmt = $pdo->prepare('
            INSERT INTO user_roadmap (user_id, subject, topic, description, order_num, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ');

        foreach ($roadmapNodes as $index => $node) {
            $orderNum = $index + 1;
            // O primeiro módulo/tópico começa como "available", os outros como "locked"
            $status = ($orderNum === 1) ? 'available' : 'locked';
            $stmt->execute([
                $userId,
                $node['subject'],
                $node['topic'],
                $node['description'],
                $orderNum,
                $status
            ]);
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Onboarding concluído e roadmap gerado com sucesso!',
            'roadmap_count' => count($roadmapNodes)
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno ao gravar dados: ' . $e->getMessage()]);
    }
}

/**
 * Função para gerar o roadmap usando a API da Gemini ou um Fallback de alta qualidade
 */
function generateRoadmap($university, $courseCategory, $specificCourse, $studyHours, $motivation) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? '';

    if (!empty($apiKey)) {
        // Tenta gerar usando a API da Gemini
        $generated = generateWithGemini($apiKey, $university, $courseCategory, $specificCourse, $studyHours, $motivation);
        if ($generated !== null) {
            return $generated;
        }
    }

    // Se falhar ou não houver chave, usa o gerador local de alta qualidade
    return generateDeterministicRoadmap($university, $courseCategory, $specificCourse);
}

/**
 * Chama a API da Gemini 2.0 Flash para criar o Roadmap Personalizado em JSON
 */
function generateWithGemini($apiKey, $university, $courseCategory, $specificCourse, $studyHours, $motivation) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $apiKey;

    $prompt = "Você é o 'Sekulo', o mestre severo e altamente focado da plataforma Jango+. Sua missão é gerar um cronograma/roadmap de preparação personalizado de 6 tópicos sequenciais para um estudante angolano que quer passar no exame de acesso da universidade '{$university}', no curso específico de '{$specificCourse}' (área de {$courseCategory}). O estudante estuda {$studyHours} horas por dia. Motivação do estudante: '{$motivation}'.

Retorne rigorosamente apenas um JSON Array com exatamente 6 elementos. Cada elemento do array deve conter as seguintes chaves com valores em português:
- 'subject': Disciplina (Ex: Matemática, Física, Biologia, Química, História, Geografia, Língua Portuguesa) adaptada aos exames de acesso de Angola para esta área.
- 'topic': O título curto do tópico de estudo (Ex: Cinemática, Funções Reais, Citologia).
- 'description': Uma frase de conselho curto e motivador (com o tom focado e exigente do Sekulo) sobre o que exatamente focar ou resolver desse tópico.

Exemplo de formato de resposta esperado:
[
  {\"subject\": \"Matemática\", \"topic\": \"Funções Reais e Gráficos\", \"description\": \"Domine funções de 1º e 2º grau da UAN. Se falhar no domínio, o Sekulo não perdoa.\"},
  ...
]

Não escreva explicações, introduções ou blocos de código markdown. Retorne apenas o array JSON válido.";

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ],
        "generationConfig" => [
            "responseMimeType" => "application/json"
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Compatibilidade local

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($text)) {
            $parsed = json_decode(trim($text), true);
            if (is_array($parsed) && count($parsed) > 0) {
                return $parsed;
            }
        }
    }

    return null;
}

/**
 * Gerador de salvaguarda (Fallback) premium
 */
function generateDeterministicRoadmap($university, $courseCategory, $specificCourse) {
    $roadmap = [];

    switch ($courseCategory) {
        case 'Engenharia':
            $roadmap = [
                [
                    'subject' => 'Matemática',
                    'topic' => 'Funções Reais e Álgebra',
                    'description' => "Indispensável na {$university}. Domine funções lineares, quadráticas e domínio de definição."
                ],
                [
                    'subject' => 'Física',
                    'topic' => 'Cinemática e Movimento Vetorial',
                    'description' => "O básico para engenharia. Estude MRU, MRUV e lançamento de projéteis verticalmente."
                ],
                [
                    'subject' => 'Matemática',
                    'topic' => 'Trigonometria e Identidades',
                    'description' => "A base do cálculo. Saiba resolver equações trigonométricas básicas sem calculadora."
                ],
                [
                    'subject' => 'Física',
                    'topic' => 'Dinâmica e Leis de Newton',
                    'description' => "Estude força de atrito, planos inclinados e blocos. Compreensão intuitiva é o segredo."
                ],
                [
                    'subject' => 'Química',
                    'topic' => 'Cálculo Estequiométrico',
                    'description' => "Cálculos de massa, moles e reagente limitante. Costuma assustar no exame."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Interpretação e Sintaxe',
                    'description' => "Evite erros eliminatórios de português. Revise análise sintática e coerência textual."
                ]
            ];
            break;

        case 'Saude':
            $roadmap = [
                [
                    'subject' => 'Biologia',
                    'topic' => 'Citologia e Estrutura Celular',
                    'description' => "Essencial para Medicina na {$university}. Foque nas organelas celulares e divisão mitótica."
                ],
                [
                    'subject' => 'Química',
                    'topic' => 'Química Orgânica e Funções',
                    'description' => "Estude nomenclatura de hidrocarbonetos, álcoois e reações de esterificação."
                ],
                [
                    'subject' => 'Biologia',
                    'topic' => 'Genética e Hereditariedade',
                    'description' => "Primeira e segunda lei de Mendel. Cruzeiros genéticos caem sempre nos exames de Luanda."
                ],
                [
                    'subject' => 'Química',
                    'topic' => 'Soluções e Concentrações',
                    'description' => "Molaridade, normalidade e diluições. Vital para a sua preparação em saúde."
                ],
                [
                    'subject' => 'Física',
                    'topic' => 'Biofísica e Óptica',
                    'description' => "Estudo de lentes esféricas, refração e o funcionamento físico do olho humano."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Acordo Ortográfico e Interpretação',
                    'description' => "Compreensão de textos científicos. Garanta que sabe pontuar corretamente."
                ]
            ];
            break;

        case 'Sociais':
            $roadmap = [
                [
                    'subject' => 'História',
                    'topic' => 'História de Angola (Sécs. XIX - XX)',
                    'description' => "Da ocupação colonial à independência. Conhecimento dos acordos é obrigatório."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Tipologia Textual e Interpretação',
                    'description' => "Análise estilística de textos literários de autores angolanos e coesão gramatical."
                ],
                [
                    'subject' => 'Geografia',
                    'topic' => 'Geografia Física e Económica de Angola',
                    'description' => "Relevo, bacias hidrográficas angolanas e principais recursos minerais e agrícolas."
                ],
                [
                    'subject' => 'História',
                    'topic' => 'Grandes Civilizações da Antiguidade',
                    'description' => "Grécia Antiga e Império Romano. Foco no surgimento do Direito e Democracia."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Sintaxe e Flexão Verbal',
                    'description' => "Regência e concordância verbal e nominal. Elimine erros de expressão."
                ],
                [
                    'subject' => 'Geografia',
                    'topic' => 'Climatografia e Demografia Global',
                    'description' => "Fatores climáticos e crescimento populacional. Essencial para áreas sociais."
                ]
            ];
            break;

        case 'Economicas':
        default:
            $roadmap = [
                [
                    'subject' => 'Matemática',
                    'topic' => 'Álgebra e Sistemas de Equações',
                    'description' => "Domine matrizes, determinantes e resolução de sistemas lineares de duas a três incógnitas."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Interpretação e Coerência Textual',
                    'description' => "Entendimento de textos jornalísticos e informativos. Análise crítica apurada."
                ],
                [
                    'subject' => 'Matemática',
                    'topic' => 'Matemática Financeira e Percentagem',
                    'description' => "Juros simples, compostos e taxas de variação. Altamente cobrados na {$university}."
                ],
                [
                    'subject' => 'Geografia',
                    'topic' => 'Globalização e Blocos Económicos',
                    'description' => "Compreensão da SADC, União Europeia e relações comerciais de Angola no mundo."
                ],
                [
                    'subject' => 'Matemática',
                    'topic' => 'Estatística Descritiva Básica',
                    'description' => "Cálculo de médias, mediana, moda e leitura correta de gráficos estatísticos."
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'topic' => 'Morfossintaxe e Pronominalização',
                    'description' => "Uso correto da colocação pronominal e das classes de palavras no texto oficial."
                ]
            ];
            break;
    }

    return $roadmap;
}
