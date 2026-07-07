<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // 1. Obter dados de onboarding do estudante para saber a área e universidade
    $stmt = $pdo->prepare('SELECT university, course_category, specific_course FROM user_onboarding WHERE user_id = ?');
    $stmt->execute([$userId]);
    $onboarding = $stmt->fetch();

    if (!$onboarding) {
        http_response_code(400);
        echo json_encode(['error' => 'Por favor, conclua o onboarding primeiro para definir as suas metas académicas.']);
        exit;
    }

    $university = $onboarding['university'];
    $courseCategory = $onboarding['course_category'];
    $specificCourse = $onboarding['specific_course'];

    // 2. Tentar obter ou gerar o simulado
    $rawExamQuestions = generateSimuladoQuestions($university, $courseCategory, $specificCourse);

    if (!$rawExamQuestions || count($rawExamQuestions) !== 10) {
        throw new Exception("Falha ao gerar um exame válido de 10 perguntas.");
    }

    // 3. Preparar o Gabarito Seguro no Servidor (Prevenir trapaças)
    $gabarito = [];
    $subjects = [];
    $clientQuestions = [];

    foreach ($rawExamQuestions as $index => $q) {
        $qId = $index + 1; // 1 a 10
        
        // Guardar gabarito na sessão
        $gabarito[$qId] = trim(strtoupper($q['correct_answer']));
        $subjects[$qId] = $q['subject'];

        // Preparar JSON para o cliente (ocultando a resposta correta!)
        $clientQuestions[] = [
            'id' => $qId,
            'subject' => $q['subject'],
            'text' => $q['text'],
            'options' => $q['options']
        ];
    }

    // Guardar gabarito completo e dados da universidade/curso nas variáveis de sessão
    $_SESSION['active_simulado_gabarito'] = $gabarito;
    $_SESSION['active_simulado_subjects'] = $subjects;
    $_SESSION['active_simulado_university'] = $university;
    $_SESSION['active_simulado_course'] = $specificCourse;
    $_SESSION['active_simulado_category'] = $courseCategory;

    echo json_encode([
        'success' => true,
        'university' => $university,
        'specific_course' => $specificCourse,
        'course_category' => $courseCategory,
        'questions' => $clientQuestions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao gerar o simulado: ' . $e->getMessage()]);
}

/**
 * Função central para gerar as perguntas de Simulado
 */
function generateSimuladoQuestions($university, $courseCategory, $specificCourse) {
    $apiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? '';

    if (!empty($apiKey)) {
        $questions = generateSimuladoWithGemini($apiKey, $university, $courseCategory, $specificCourse);
        if ($questions !== null && count($questions) === 10) {
            return $questions;
        }
    }

    // Fallback de altíssima qualidade se a API falhar ou não houver chave
    return generateDeterministicSimulado($university, $courseCategory);
}

/**
 * Geração de Simulado via Gemini 2.0 Flash
 */
function generateSimuladoWithGemini($apiKey, $university, $courseCategory, $specificCourse) {
    global $pdo;

    $trainingContext = '';
    try {
        $stmtTrain = $pdo->prepare('
            SELECT topic, content 
            FROM sekulo_training 
            WHERE course_category = ? OR LOWER(specific_course) = LOWER(?)
        ');
        $stmtTrain->execute([$courseCategory, $specificCourse]);
        $trainingRows = $stmtTrain->fetchAll();
        
        if (!empty($trainingRows)) {
            $trainingContext = "\nIMPORTANTE: O administrador treinou o Sekulo com os seguintes conteúdos e temas teóricos. Você DEVE usar estas informações para inspirar e formular os assuntos e enunciados das perguntas do simulado:\n";
            foreach ($trainingRows as $row) {
                $trainingContext .= "- Assunto: {$row['topic']}\n  Detalhes Teóricos: {$row['content']}\n";
            }
        }
    } catch (Exception $e) {
        // Silently skip if query fails
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . $apiKey;

    $prompt = "Você é o 'Sekulo', o mestre severo e focado da plataforma Jango+. Sua missão é gerar um simulado preparatório completo de exames de acesso de Angola com exatamente 10 perguntas de múltipla escolha.
O simulado é direcionado para a universidade '{$university}', no curso específico de '{$specificCourse}' (área de {$courseCategory}).
Gere questões complexas e desafiadoras, no nível real do exame da UAN/UCAN. Cada pergunta deve ser de múltipla escolha com 4 opções marcadas de A a D.

As disciplinas cobradas no simulado devem obedecer estritamente à área de estudos de Angola:
- Se for Engenharia: Matemática (4 questões), Física (4 questões), Língua Portuguesa (2 questões).
- Se for Saúde: Biologia (4 questões), Química (4 questões), Física (1 questão), Língua Portuguesa (1 questão).
- Se for Económicas/Sociais: Matemática (3 questões), Geografia/História (5 questões), Língua Portuguesa (2 questões).

{$trainingContext}

Retorne rigorosamente apenas um JSON Array com exatamente 10 elementos. Cada elemento deve conter as seguintes chaves com valores em português:
- 'subject': Disciplina correspondente.
- 'text': O enunciado técnico e complexo da questão.
- 'options': Um array de exatamente 4 strings contendo as opções formatadas como ['A) [opção]', 'B) [opção]', 'C) [opção]', 'D) [opção]'].
- 'correct_answer': A letra maiúscula da resposta correta (A, B, C ou D).

Não escreva nenhuma explicação, preâmbulo ou formatação em markdown. Retorne apenas o array JSON válido.";

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
    curl_setopt($ch, CURLOPT_TIMEOUT, 18);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $resData = json_decode($response, true);
        $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($text)) {
            $parsed = json_decode(trim($text), true);
            if (is_array($parsed) && count($parsed) === 10) {
                return $parsed;
            }
        }
    }

    return null;
}

/**
 * Fallback de Alta Qualidade com Banco de Questões Estáticas desafiantes baseadas em Angola
 */
function generateDeterministicSimulado($university, $courseCategory) {
    $questions = [];

    switch ($courseCategory) {
        case 'Engenharia':
            $questions = [
                [
                    'subject' => 'Matemática',
                    'text' => 'Determine o domínio de definição da função real de variável real f(x) = sqrt(x^2 - 4) / ln(x - 2).',
                    'options' => [
                        'A) x > 2',
                        'B) x >= 2 e x != 3',
                        'C) x > 2 e x != 3',
                        'D) x > 3'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Qual é o valor limite quando x tende a 0 de f(x) = (1 - cos(x)) / x^2?',
                    'options' => [
                        'A) 0',
                        'B) 1/2',
                        'C) 1',
                        'D) Infinito'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Física',
                    'text' => 'Um projétil é lançado obliquamente com velocidade v0 = 50 m/s sob um ângulo de 30° com a horizontal. Desprezando a resistência do ar e g=10m/s^2, qual é o tempo total de voo?',
                    'options' => [
                        'A) 2.5 s',
                        'B) 5 s',
                        'C) 7.5 s',
                        'D) 10 s'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Física',
                    'text' => 'Um bloco de 5 kg está sobre um plano inclinado liso de 30° com a horizontal. Qual é a força necessária, paralela ao plano, para manter o bloco em repouso? (g=10m/s^2)',
                    'options' => [
                        'A) 25 N',
                        'B) 43.3 N',
                        'C) 50 N',
                        'D) 10 N'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Seja f(x) = 2x^3 - 3x^2 - 12x + 5. Em qual intervalo a função f(x) é decrescente?',
                    'options' => [
                        'A) ]-infinito, -1[',
                        'B) ]-1, 2[',
                        'C) ]2, +infinito[',
                        'D) ]-infinito, 2['
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Física',
                    'text' => 'Um capacitor de placas paralelas possui capacitância C0. Se a distância d entre as placas for reduzida à metade e a área A for duplicada, a nova capacitância será:',
                    'options' => [
                        'A) C0 / 4',
                        'B) C0',
                        'C) 2 * C0',
                        'D) 4 * C0'
                    ],
                    'correct_answer' => 'D'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Qual é o valor do determinant de uma matriz de ordem 3 cuja diagonal principal possui valores 2, 3 e 4, e todos os elementos fora da diagonal são iguais a zero?',
                    'options' => [
                        'A) 9',
                        'B) 14',
                        'C) 24',
                        'D) 0'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Física',
                    'text' => 'Uma onda sonora propaga-se no ar a 340 m/s com frequência f = 170 Hz. Qual é o seu comprimento de onda?',
                    'options' => [
                        'A) 0.5 m',
                        'B) 2 m',
                        'C) 20 m',
                        'D) 34 m'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Indique a frase cuja regência verbal respeita estritamente a norma-padrão da Língua Portuguesa.',
                    'options' => [
                        'A) O candidato aspirava o cargo de engenheiro na Sonangol.',
                        'B) O candidato aspirava ao cargo de engenheiro na Sonangol.',
                        'C) Nós assistimos o filme sobre os recursos minerais ontem.',
                        'D) Eu prefiro mais física do que química.'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Assinale a alternativa que contém a correta classificação sintática da oração subordinada em: "É necessário que todos os estudantes do Sekulo mantenham o foco."',
                    'options' => [
                        'A) Oração subordinada substantiva subjetiva',
                        'B) Oração subordinada substantiva objetiva direta',
                        'C) Oração subordinada substantiva completiva nominal',
                        'D) Oração subordinada adjetiva explicativa'
                    ],
                    'correct_answer' => 'A'
                ]
            ];
            break;

        case 'Saude':
            $questions = [
                [
                    'subject' => 'Biologia',
                    'text' => 'Qual das seguintes organelas celulares é a principal responsável pela respiração celular aeróbia e produção de ATP?',
                    'options' => [
                        'A) Lisossoma',
                        'B) Retículo Endoplasmático Rugoso',
                        'C) Mitocôndria',
                        'D) Complexo de Golgi'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Biologia',
                    'text' => 'Na primeira lei de Mendel, quando cruzamos plantas de ervilhas heterozigóticas de sementes amarelas (Vv), a proporção fenotípica esperada na geração F1 é:',
                    'options' => [
                        'A) 1 amarela : 1 verde',
                        'B) 3 amarelas : 1 verde',
                        'C) 100% amarelas',
                        'D) 9 amarelas : 3 verdes'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Química',
                    'text' => 'Qual é a hibridização dos átomos de carbono envolvidos em uma ligação tripla numa molécula de acetileno (etino)?',
                    'options' => [
                        'A) sp',
                        'B) sp2',
                        'C) sp3',
                        'D) dsp2'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Química',
                    'text' => 'O pH de uma solução aquosa cuja concentração de iões H+ é 1,0 * 10^-5 M vale exatamente:',
                    'options' => [
                        'A) 5',
                        'B) 9',
                        'C) 7',
                        'D) 1'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Biologia',
                    'text' => 'O processo de transcrição consiste na síntese de uma molécula de:',
                    'options' => [
                        'A) Proteína a partir de um molde de DNA',
                        'B) RNA a partir de um molde de DNA',
                        'C) DNA a partir de um molde de RNA',
                        'D) Proteína a partir de um molde de RNA'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Química',
                    'text' => 'Numa reação endotérmica, o valor da variação de entalpia (delta H) é sempre:',
                    'options' => [
                        'A) Igual a zero',
                        'B) Menor que zero (negativo)',
                        'C) Maior que zero (positivo)',
                        'D) Variável e imprevisível'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Biologia',
                    'text' => 'O agente etiológico causador da Malária, doença de elevada prevalência em Angola, pertence a qual táxon?',
                    'options' => [
                        'A) Vírus (gênero Influenza)',
                        'B) Bactéria (gênero Mycobacterium)',
                        'C) Protozoário (gênero Plasmodium)',
                        'D) Fungo (gênero Candida)'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Química',
                    'text' => 'O número de oxidação (NOX) do átomo de manganês na molécula de permanganato de potássio (KMnO4) é:',
                    'options' => [
                        'A) +2',
                        'B) +5',
                        'C) +7',
                        'D) +8'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Física',
                    'text' => 'Um feixe de luz monocromático atravessa a fronteira entre o ar (n=1) e a água (n=1.33). Na água, a velocidade da luz e a sua frequência sofrem as seguintes alterações:',
                    'options' => [
                        'A) Velocidade diminui, frequência permanece constante.',
                        'B) Velocidade diminui, frequência diminui.',
                        'C) Velocidade aumenta, frequência aumenta.',
                        'D) Velocidade permanece constante, frequência diminui.'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Identifique o erro crasso de concordância nominal presente em uma das opções abaixo.',
                    'options' => [
                        'A) As médicas da clínica estavam bastante preocupadas com os casos.',
                        'B) Ela mesma redigiu o relatório das admissões hospitalares.',
                        'C) Seguem inclusas as guias de exames de laboratório.',
                        'D) É proibido a entrada de estranhos neste laboratório médico.'
                    ],
                    'correct_answer' => 'D'
                ]
            ];
            break;

        case 'Sociais':
            $questions = [
                [
                    'subject' => 'História',
                    'text' => 'Os Acordos de Alvor, assinados em Janeiro de 1975, destinavam-se a regular a transição para a independência de Angola. Quais eram os três movimentos de libertação angolanos signatários do acordo?',
                    'options' => [
                        'A) MPLA, FNLA e UNITA',
                        'B) MPLA, FLEC e UNITA',
                        'C) MPLA, FNLA e FLEC',
                        'D) FNLA, UNITA e UPA'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'História',
                    'text' => 'A Conferência de Berlim (1884-1885) desempenhou um papel central na partilha de África. O critério básico adotado para legitimar a posse colonial de territórios passou a ser:',
                    'options' => [
                        'A) A descoberta histórica inicial do território.',
                        'B) O estabelecimento de rotas comerciais costeiras.',
                        'C) O princípio da ocupação efetiva.',
                        'D) A assinatura de tratados comerciais locais exclusivamente.'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'Qual é a bacia hidrográfica mais extensa e de maior vazão de Angola, cujo rio homónimo desagua no Oceano Atlântico a sul de Luanda?',
                    'options' => [
                        'A) Bacia do Zambeze',
                        'B) Bacia do Cuanza',
                        'C) Bacia do Cunene',
                        'D) Bacia do Zaire'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Assinale o período que contém uma conjunção subordinativa concessiva.',
                    'options' => [
                        'A) Como o Sekulo exigia muito, todos estudavam até tarde.',
                        'B) Caso estudes bastante, passarás na UAN.',
                        'C) Embora estivesse cansado, o estudante resolveu o simulado completo.',
                        'D) O estudante passou no exame de acesso porque focou na missão diária.'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'História',
                    'text' => 'O Reino do Congo possuía uma capital administrativa imponente. Qual era o seu nome antes de ser batizada de São Salvador?',
                    'options' => [
                        'A) Mbanza Congo',
                        'B) Soyo',
                        'C) Cabinda',
                        'D) Luanda'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'Qual destas províncias angolanas é um enclave geográfico, separada do restante território nacional pela República Democrática do Congo?',
                    'options' => [
                        'A) Zaire',
                        'B) Cabinda',
                        'C) Lunda Norte',
                        'D) Uíge'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'História',
                    'text' => 'Em qual período da História Geral situa-se o surgimento e a expansão da Democracia e do Direito Romano?',
                    'options' => [
                        'A) Idade Média',
                        'B) Idade Antiga',
                        'C) Idade Moderna',
                        'D) Idade Contemporânea'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'O clima característico da zona litoral centro e sul de Angola (como Namibe e Benguela), fortemente influenciado pela corrente fria de Benguela, é:',
                    'options' => [
                        'A) Tropical Húmido',
                        'B) Semiárido / Desértico',
                        'C) Subtropical de Altitude',
                        'D) Equatorial Húmido'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Assinale a alternativa que apresenta oração sem sujeito.',
                    'options' => [
                        'A) Choveu elogios após a divulgação da lista de admitidos.',
                        'B) Fazia dez meses que ele não descansava dos estudos.',
                        'C) Vende-se apostilas e livros da UAN na esquina.',
                        'D) Chegaram os estudantes e o professor no Jango.'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Que figura de estilo está presente na frase: "O Sekulo tem um coração de pedra, mas os seus ensinamentos valem ouro"?',
                    'options' => [
                        'A) Eufemismo',
                        'B) Metáfora',
                        'C) Hipérbole',
                        'D) Pleonasmo'
                    ],
                    'correct_answer' => 'B'
                ]
            ];
            break;

        case 'Economicas':
        default:
            $questions = [
                [
                    'subject' => 'Matemática',
                    'text' => 'Um investidor aplicou um capital de 100.000 Kwanza a uma taxa de juros simples de 10% ao ano. Qual será o montante total acumulado ao final de 3 anos?',
                    'options' => [
                        'A) 110.000 Kz',
                        'B) 130.000 Kz',
                        'C) 133.100 Kz',
                        'D) 150.000 Kz'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Qual é a solução do sistema de equações lineares: { x + y = 10, 2x - y = 8 }?',
                    'options' => [
                        'A) x = 5, y = 5',
                        'B) x = 6, y = 4',
                        'C) x = 7, y = 3',
                        'D) x = 8, y = 2'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'A SADC (Comunidade de Desenvolvimento da África Austral) é um bloco económico regional do qual Angola faz parte. Qual é a principal missão deste bloco?',
                    'options' => [
                        'A) Implementação de moeda única imediata em todos os membros.',
                        'B) Integração económica regional e cooperação em segurança.',
                        'C) Proteção militar contra países do norte da África.',
                        'D) Estabelecimento de tarifas alfandegárias livres para todo o mundo.'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Se o preço de um livro de preparação de exames aumentou de 4.000 Kz para 5.000 Kz, qual foi a taxa percentual de aumento?',
                    'options' => [
                        'A) 20%',
                        'B) 25%',
                        'C) 30%',
                        'D) 50%'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'Em estatística descritiva, a medida de tendência central correspondente ao valor que ocorre com maior frequência em um conjunto de dados é chamada de:',
                    'options' => [
                        'A) Média aritmética',
                        'B) Mediana',
                        'C) Moda',
                        'D) Desvio padrão'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'O principal produto mineral de exportação de Angola, que representa a maior parcela das receitas fiscais do país, é:',
                    'options' => [
                        'A) Diamante',
                        'B) Ouro',
                        'C) Petróleo bruto',
                        'D) Cobre'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Matemática',
                    'text' => 'A soma das raízes da equação do segundo grau x^2 - 7x + 12 = 0 é dada por:',
                    'options' => [
                        'A) -7',
                        'B) 7',
                        'C) 12',
                        'D) 5'
                    ],
                    'correct_answer' => 'B'
                ],
                [
                    'subject' => 'Geografia',
                    'text' => 'Qual é a denominação da instituição financeira que atua como Banco Central da República de Angola, responsável pela regulação da moeda Kwanza?',
                    'options' => [
                        'A) BFA',
                        'B) BIC',
                        'C) BNA',
                        'D) BCI'
                    ],
                    'correct_answer' => 'C'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Identifique o termo destacado em: "Os exames de admissão da universidade *são extremamente concorridos*."',
                    'options' => [
                        'A) Predicativo do sujeito',
                        'B) Predicativo do objeto',
                        'C) Adjunto adnominal',
                        'D) Objeto direto'
                    ],
                    'correct_answer' => 'A'
                ],
                [
                    'subject' => 'Língua Portuguesa',
                    'text' => 'Assinale a opção em que a colocação pronominal respeita a norma culta de redação.',
                    'options' => [
                        'A) Me disseram que a prova da UAN será muito difícil.',
                        'B) O Sekulo não perdoa-me por este erro bobo.',
                        'C) Nunca me disseram que o simulado exigia tanto foco.',
                        'D) O candidato sente-se preparado, mas não esforça-se.'
                    ],
                    'correct_answer' => 'C'
                ]
            ];
            break;
    }

    return $questions;
}
