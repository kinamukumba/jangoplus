<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
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
    // 1. Obter o tópico de estudo ativo (o primeiro com status 'available')
    $stmt = $pdo->prepare('
        SELECT id, subject, topic, description, order_num 
        FROM user_roadmap 
        WHERE user_id = ? AND status = "available"
        ORDER BY order_num ASC 
        LIMIT 1
    ');
    $stmt->execute([$userId]);
    $activeTopic = $stmt->fetch();

    if (!$activeTopic) {
        // Se não houver tópico ativo, vamos ver se o utilizador já completou tudo
        $stmtAll = $pdo->prepare('SELECT COUNT(*) as total FROM user_roadmap WHERE user_id = ?');
        $stmtAll->execute([$userId]);
        $totalNodes = $stmtAll->fetch()['total'];

        if ($totalNodes > 0) {
            echo json_encode([
                'success' => true,
                'completed_all' => true,
                'message' => 'Parabéns! Completaste todos os módulos do teu roadmap. Estás pronto para o exame!'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Nenhum roadmap encontrado. Por favor, realiza primeiro o onboarding.'
            ]);
        }
        exit;
    }

    // Buscar universidade para contexto da IA
    $stmtUniv = $pdo->prepare('SELECT university FROM user_onboarding WHERE user_id = ?');
    $stmtUniv->execute([$userId]);
    $univRow = $stmtUniv->fetch();
    $university = $univRow ? $univRow['university'] : 'Universidade Agostinho Neto';

    // 2. Gerar o Quiz (Gemini API ou Fallback)
    $quiz = generateQuiz($university, $activeTopic['subject'], $activeTopic['topic']);

    if (!$quiz || empty($quiz['questions'])) {
        throw new Exception("Erro ao gerar as perguntas do quiz.");
    }

    // 3. Salvar as respostas corretas na sessão (Segurança!)
    $correctAnswers = [];
    $clientQuestions = [];

    foreach ($quiz['questions'] as $q) {
        $correctAnswers[$q['id']] = trim(strtoupper($q['correct']));
        
        // Removemos a resposta correta antes de enviar ao cliente
        $clientQuestions[] = [
            'id' => $q['id'],
            'text' => $q['text'],
            'options' => $q['options']
        ];
    }

    $_SESSION['quiz_answers'] = $correctAnswers;
    $_SESSION['quiz_topic_id'] = $activeTopic['id'];
    $_SESSION['quiz_order_num'] = $activeTopic['order_num'];

    echo json_encode([
        'success' => true,
        'completed_all' => false,
        'topic_id' => $activeTopic['id'],
        'subject' => $activeTopic['subject'],
        'topic' => $activeTopic['topic'],
        'description' => $activeTopic['description'],
        'questions' => $clientQuestions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao buscar missão: ' . $e->getMessage()]);
}

/**
 * Lógica central para gerar as perguntas
 */
function generateQuiz($university, $subject, $topic) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? '';

    if (!empty($apiKey)) {
        $quiz = generateQuizWithGemini($apiKey, $university, $subject, $topic);
        if ($quiz !== null) {
            return $quiz;
        }
    }

    return generateQuizDeterministic($subject, $topic);
}

/**
 * Gemini API Quiz Generator
 */
function generateQuizWithGemini($apiKey, $university, $subject, $topic) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $apiKey;

    $prompt = "Você é o 'Sekulo', o mestre severo e focado da plataforma Jango+. Sua tarefa é gerar um mini-quiz de exatamente 3 perguntas de escolha múltipla (A, B, C, D) para testar os conhecimentos de um aluno angolano no tema '{$topic}' da disciplina de '{$subject}' para a entrada na '{$university}'. As perguntas devem ser realistas e de nível de exame de acesso.

Retorne rigorosamente apenas um JSON Object contendo a chave 'questions' com um array de exatamente 3 objetos. Cada objeto de pergunta deve ter:
- 'id': Número de 1 a 3.
- 'text': O enunciado da pergunta em português de forma clara.
- 'options': Um array de strings contendo exatamente 4 opções formatadas como ['A) ...', 'B) ...', 'C) ...', 'D) ...'].
- 'correct': Apenas um caractere ('A', 'B', 'C', ou 'D') indicando a opção correta.

Exemplo de formato:
{
  \"questions\": [
    {
      \"id\": 1,
      \"text\": \"Enunciado da pergunta...\",
      \"options\": [\"A) Opção 1\", \"B) Opção 2\", \"C) Opção 3\", \"D) Opção 4\"],
      \"correct\": \"B\"
    },
    ...
  ]
}

Não insira formatação markdown (como ```json) ou qualquer explicação adicional. Retorne apenas o JSON puro.";

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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($text)) {
            $parsed = json_decode(trim($text), true);
            if (is_array($parsed) && isset($parsed['questions']) && count($parsed['questions']) === 3) {
                return $parsed;
            }
        }
    }

    return null;
}

/**
 * Fallback local robusto se não houver internet ou chave API
 */
function generateQuizDeterministic($subject, $topic) {
    // Banco de perguntas de fallback pré-formatadas para disciplinas chave
    $questions = [];

    if ($subject === 'Matemática') {
        if (strpos($topic, 'Funções') !== false) {
            $questions = [
                [
                    'id' => 1,
                    'text' => "Seja a função real dada por f(x) = (2x - 4) / (x - 3). Qual é o domínio de definição da função f(x)?",
                    'options' => ["A) R (Todos os números reais)", "B) R \ {2}", "C) R \ {3}", "D) ]3, +∞["],
                    'correct' => 'C'
                ],
                [
                    'id' => 2,
                    'text' => "Qual das seguintes funções representa uma parábola com concavidade voltada para cima e vértice na origem (0,0)?",
                    'options' => ["A) f(x) = -x²", "B) f(x) = 2x²", "C) f(x) = 2x", "D) f(x) = x² + 1"],
                    'correct' => 'B'
                ],
                [
                    'id' => 3,
                    'text' => "Se g(x) = x² - 3x + 2, qual é o valor dos zeros da função g(x)?",
                    'options' => ["A) x = 1 e x = 2", "B) x = -1 e x = -2", "C) x = 0 e x = 2", "D) Não possui zeros reais"],
                    'correct' => 'A'
                ]
            ];
        } else if (strpos($topic, 'Trigonometria') !== false) {
            $questions = [
                [
                    'id' => 1,
                    'text' => "Qual é o valor exato do seno de 150 graus?",
                    'options' => ["A) 1/2", "B) -1/2", "C) √3/2", "D) -√3/2"],
                    'correct' => 'A'
                ],
                [
                    'id' => 2,
                    'text' => "Identifique a relação fundamental da trigonometria que é sempre verdadeira para qualquer ângulo real x:",
                    'options' => ["A) sen(x) + cos(x) = 1", "B) sen²(x) - cos²(x) = 1", "C) tg²(x) + 1 = sec²(x)", "D) sen²(x) + cos²(x) = 1"],
                    'correct' => 'D'
                ],
                [
                    'id' => 3,
                    'text' => "Se cos(x) = 0 e x está no intervalo [0, π], qual é o valor de x?",
                    'options' => ["A) 0", "B) π/2", "C) π", "D) π/4"],
                    'correct' => 'B'
                ]
            ];
        } else {
            // Álgebra Geral / Sistemas
            $questions = [
                [
                    'id' => 1,
                    'text' => "Resolvendo o sistema linear: x + y = 5 e 2x - y = 1. Qual é o par ordenado (x, y) solução?",
                    'options' => ["A) (2, 3)", "B) (3, 2)", "C) (4, 1)", "D) (1, 4)"],
                    'correct' => 'A'
                ],
                [
                    'id' => 2,
                    'text' => "Se log de x na base 2 é igual a 5 (log₂x = 5), qual é o valor de x?",
                    'options' => ["A) 10", "B) 25", "C) 32", "D) 64"],
                    'correct' => 'C'
                ],
                [
                    'id' => 3,
                    'text' => "Qual o valor de x na equação exponencial 3^(x+1) = 27?",
                    'options' => ["A) 1", "B) 2", "C) 3", "D) 4"],
                    'correct' => 'B'
                ]
            ];
        }
    } else if ($subject === 'Física') {
        if (strpos($topic, 'Cinemática') !== false) {
            $questions = [
                [
                    'id' => 1,
                    'text' => "Um carro viaja com velocidade constante de 72 km/h. Qual a distância que ele percorre em 10 segundos, expressa no Sistema Internacional (MKS)?",
                    'options' => ["A) 720 metros", "B) 200 metros", "C) 72 metros", "D) 20 metros"],
                    'correct' => 'B'
                ],
                [
                    'id' => 2,
                    'text' => "Um corpo é lançado verticalmente para cima com velocidade inicial de 20 m/s. Considerando g = 10 m/s² e desprezando o atrito do ar, qual é o tempo de subida até a altura máxima?",
                    'options' => ["A) 1 segundo", "B) 2 segundos", "C) 3 segundos", "D) 4 segundos"],
                    'correct' => 'B'
                ],
                [
                    'id' => 3,
                    'text' => "No Movimento Retilíneo Uniformemente Variado (MRUV), o gráfico da velocidade em função do tempo é representado por:",
                    'options' => ["A) Uma reta paralela ao eixo do tempo", "B) Uma reta inclinada", "C) Uma parábola", "D) Uma circunferência"],
                    'correct' => 'B'
                ]
            ];
        } else {
            // Dinâmica e Leis de Newton
            $questions = [
                [
                    'id' => 1,
                    'text' => "Um bloco de massa 5 kg está sob a ação de uma força resultante horizontal constante de 20 N. Qual a aceleração adquirida pelo bloco?",
                    'options' => ["A) 2 m/s²", "B) 4 m/s²", "C) 100 m/s²", "D) 0.25 m/s²"],
                    'correct' => 'B'
                ],
                [
                    'id' => 2,
                    'text' => "Qual das Leis de Newton afirma que 'toda ação corresponde a uma reação de igual intensidade e sentido oposto'?",
                    'options' => ["A) Primeira Lei", "B) Segunda Lei", "C) Terceira Lei", "D) Lei da Gravitação"],
                    'correct' => 'C'
                ],
                [
                    'id' => 3,
                    'text' => "Um livro está em repouso sobre uma mesa horizontal. Quais são as duas principais forças verticais atuando sobre ele que se equilibram?",
                    'options' => ["A) Peso e Tração", "B) Normal e Atrito", "C) Peso e Normal", "D) Centrípeta e Normal"],
                    'correct' => 'C'
                ]
            ];
        }
    } else if ($subject === 'Biologia') {
        $questions = [
            [
                'id' => 1,
                'text' => "Qual é a organela celular responsável pela respiração celular e produção de energia (ATP) nas células eucarióticas?",
                'options' => ["A) Complexo de Golgi", "B) Ribossoma", "C) Mitocôndria", "D) Cloroplasto"],
                'correct' => 'C'
            ],
            [
                'id' => 2,
                'text' => "Em genética, como chamamos o conjunto de genes e a constituição genética de um indivíduo que não pode ser vista diretamente?",
                'options' => ["A) Fenótipo", "B) Genótipo", "C) Cariótipo", "D) Genoma"],
                'correct' => 'B'
            ],
            [
                'id' => 3,
                'text' => "Qual é a principal diferença estrutural entre células procarióticas (bactérias) e eucarióticas?",
                'options' => ["A) Células procarióticas não têm membrana plasmática", "B) Células procarióticas não têm material genético", "C) Células procarióticas não têm núcleo delimitado por membrana (carioteca)", "D) Células procarióticas são maiores"],
                'correct' => 'C'
            ]
        ];
    } else {
        // Fallback genérico para Português/História/outros
        $questions = [
            [
                'id' => 1,
                'text' => "Na frase: 'O estudante angolano passou no exame com distinção.' Qual é a função sintática da palavra 'O estudante angolano'?",
                'options' => ["A) Objeto Direto", "B) Sujeito Simples", "C) Predicativo do Sujeito", "D) Complemento Nominal"],
                'correct' => 'B'
            ],
            [
                'id' => 2,
                'text' => "Qual das seguintes obras literárias é da autoria de um dos maiores escritores angolanos, Pepetela?",
                'options' => ["A) Sagrada Esperança", "B) Mayombe", "C) Terra Sonâmbula", "D) Luuanda"],
                'correct' => 'B'
            ],
            [
                'id' => 3,
                'text' => "Identifique a palavra escrita incorretamente de acordo com a grafia oficial:",
                'options' => ["A) Analisar", "B) Pesquizar", "C) Exceção", "D) Paralisação"],
                'correct' => 'B'
            ]
        ];
    }

    return ['questions' => $questions];
}
