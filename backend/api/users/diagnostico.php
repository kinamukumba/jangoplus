<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

// 10 perguntas de diagnóstico por categoria
// Nível básico/intermédio — avalia o ponto de partida, não o exame final
function getQuestions(string $category): array {
    $bank = [
        'Engenharia' => [
            ['subject'=>'Matemática','text'=>'Qual é o valor de log₂(8)?','options'=>['A) 2','B) 3','C) 4','D) 8'],'correct'=>'B'],
            ['subject'=>'Matemática','text'=>'A derivada de f(x) = x³ é:','options'=>['A) 3x','B) x²','C) 3x²','D) 3x⁴'],'correct'=>'C'],
            ['subject'=>'Matemática','text'=>'Quantos graus tem a soma dos ângulos internos de um triângulo?','options'=>['A) 90°','B) 180°','C) 270°','D) 360°'],'correct'=>'B'],
            ['subject'=>'Matemática','text'=>'Se 2x + 4 = 12, então x =','options'=>['A) 2','B) 4','C) 6','D) 8'],'correct'=>'B'],
            ['subject'=>'Física','text'=>'A unidade SI de força é:','options'=>['A) Joule','B) Pascal','C) Newton','D) Watt'],'correct'=>'C'],
            ['subject'=>'Física','text'=>'Um corpo em repouso ficará em repouso a menos que uma força actue sobre ele. Qual é esta lei?','options'=>['A) 2ª Lei de Newton','B) 1ª Lei de Newton','C) Lei de Hooke','D) Lei de Ohm'],'correct'=>'B'],
            ['subject'=>'Física','text'=>'A velocidade da luz no vácuo é aproximadamente:','options'=>['A) 3×10⁶ m/s','B) 3×10⁸ m/s','C) 3×10¹⁰ m/s','D) 3×10⁴ m/s'],'correct'=>'B'],
            ['subject'=>'Física','text'=>'Energia cinética é dada por:','options'=>['A) mgh','B) mv','C) ½mv²','D) ma'],'correct'=>'C'],
            ['subject'=>'Português','text'=>'Qual das frases está correctamente escrita?','options'=>['A) Eu fazei a tarefa','B) Eu fiz a tarefa','C) Eu faço feito a tarefa','D) Eu fizei a tarefa'],'correct'=>'B'],
            ['subject'=>'Português','text'=>'O antónimo de "moderno" é:','options'=>['A) Novo','B) Actual','C) Antiquado','D) Contemporâneo'],'correct'=>'C'],
        ],
        'Saude' => [
            ['subject'=>'Biologia','text'=>'O DNA é composto por quatro bases nitrogenadas. Qual NÃO é uma delas?','options'=>['A) Adenina','B) Uracilo','C) Citosina','D) Guanina'],'correct'=>'B'],
            ['subject'=>'Biologia','text'=>'Qual organelo é responsável pela síntese de proteínas?','options'=>['A) Mitocôndria','B) Núcleo','C) Ribossomo','D) Vacúolo'],'correct'=>'C'],
            ['subject'=>'Biologia','text'=>'O processo pelo qual as plantas produzem alimento usando a luz solar chama-se:','options'=>['A) Respiração','B) Fotossíntese','C) Fermentação','D) Digestão'],'correct'=>'B'],
            ['subject'=>'Biologia','text'=>'Quantos cromossomas tem uma célula humana normal?','options'=>['A) 23','B) 46','C) 48','D) 22'],'correct'=>'B'],
            ['subject'=>'Química','text'=>'Qual é a fórmula química da água?','options'=>['A) CO₂','B) NaCl','C) H₂O','D) O₂'],'correct'=>'C'],
            ['subject'=>'Química','text'=>'O número atómico do carbono é:','options'=>['A) 2','B) 4','C) 6','D) 8'],'correct'=>'C'],
            ['subject'=>'Química','text'=>'Uma reacção que liberta calor chama-se:','options'=>['A) Endotérmica','B) Exotérmica','C) Catalítica','D) Reversível'],'correct'=>'B'],
            ['subject'=>'Física','text'=>'A pressão arterial normal em adultos é aproximadamente:','options'=>['A) 80/120 mmHg','B) 120/80 mmHg','C) 60/100 mmHg','D) 140/90 mmHg'],'correct'=>'B'],
            ['subject'=>'Português','text'=>'Qual é o plural correcto de "cidadão"?','options'=>['A) Cidadões','B) Cidadões','C) Cidadãos','D) Cidadons'],'correct'=>'C'],
            ['subject'=>'Português','text'=>'Identifica o sujeito: "O médico examinou o paciente."','options'=>['A) O paciente','B) examinou','C) O médico','D) Não tem sujeito'],'correct'=>'C'],
        ],
        'Sociais' => [
            ['subject'=>'História','text'=>'Angola alcançou a independência em:','options'=>['A) 1961','B) 1974','C) 1975','D) 1980'],'correct'=>'C'],
            ['subject'=>'História','text'=>'Quem foi o primeiro Presidente de Angola?','options'=>['A) Jonas Savimbi','B) Agostinho Neto','C) José Eduardo dos Santos','D) Holden Roberto'],'correct'=>'B'],
            ['subject'=>'História','text'=>'A Revolução Francesa ocorreu em:','options'=>['A) 1776','B) 1789','C) 1815','D) 1848'],'correct'=>'B'],
            ['subject'=>'História','text'=>'A Segunda Guerra Mundial terminou em:','options'=>['A) 1943','B) 1944','C) 1945','D) 1946'],'correct'=>'C'],
            ['subject'=>'Geografia','text'=>'Qual é a capital de Angola?','options'=>['A) Benguela','B) Lubango','C) Luanda','D) Huambo'],'correct'=>'C'],
            ['subject'=>'Geografia','text'=>'O rio mais longo do mundo é:','options'=>['A) Amazonas','B) Congo','C) Nilo','D) Mississípi'],'correct'=>'C'],
            ['subject'=>'Geografia','text'=>'Angola faz fronteira com quantos países?','options'=>['A) 3','B) 4','C) 5','D) 6'],'correct'=>'B'],
            ['subject'=>'Geografia','text'=>'Qual continente tem mais países?','options'=>['A) Ásia','B) América','C) Europa','D) África'],'correct'=>'D'],
            ['subject'=>'Português','text'=>'"Outrossim" significa:','options'=>['A) Por outro lado','B) Da mesma forma','C) Ao contrário','D) Apesar disso'],'correct'=>'B'],
            ['subject'=>'Português','text'=>'Qual é a classe gramatical de "rapidamente"?','options'=>['A) Adjectivo','B) Verbo','C) Advérbio','D) Substantivo'],'correct'=>'C'],
        ],
        'Economicas' => [
            ['subject'=>'Matemática','text'=>'Qual é o valor de 15% de 200?','options'=>['A) 15','B) 20','C) 25','D) 30'],'correct'=>'D'],
            ['subject'=>'Matemática','text'=>'A raiz quadrada de 144 é:','options'=>['A) 10','B) 11','C) 12','D) 14'],'correct'=>'C'],
            ['subject'=>'Matemática','text'=>'Se um produto custa 5000 Kz e tem 20% de desconto, o preço final é:','options'=>['A) 3500 Kz','B) 4000 Kz','C) 4500 Kz','D) 4800 Kz'],'correct'=>'B'],
            ['subject'=>'Matemática','text'=>'Qual é a fórmula do juro simples?','options'=>['A) J = C × i × t','B) J = C + i + t','C) J = C / (i × t)','D) J = (C × t) / i'],'correct'=>'A'],
            ['subject'=>'Geografia','text'=>'Qual é a moeda de Angola?','options'=>['A) Real','B) Kwanza','C) Cedi','D) Naira'],'correct'=>'B'],
            ['subject'=>'Geografia','text'=>'Angola é o maior produtor africano de:','options'=>['A) Café','B) Ouro','C) Petróleo','D) Diamantes'],'correct'=>'C'],
            ['subject'=>'Geografia','text'=>'Qual é a maior economia de África?','options'=>['A) Angola','B) Nigéria','C) África do Sul','D) Egito'],'correct'=>'B'],
            ['subject'=>'Geografia','text'=>'A OPEP é uma organização de países:','options'=>['A) Exportadores de petróleo','B) Produtores de energia','C) Económicos europeus','D) Africanos unidos'],'correct'=>'A'],
            ['subject'=>'Português','text'=>'A palavra "lucro" é sinónimo de:','options'=>['A) Prejuízo','B) Custo','C) Ganho','D) Despesa'],'correct'=>'C'],
            ['subject'=>'Português','text'=>'Qual é o antónimo de "exportar"?','options'=>['A) Vender','B) Importar','C) Produzir','D) Distribuir'],'correct'=>'B'],
        ],
    ];

    $questions = $bank[$category] ?? $bank['Engenharia'];

    // Guardar gabarito na sessão
    $gabarito = [];
    foreach ($questions as $i => $q) {
        $gabarito[$i + 1] = $q['correct'];
    }
    $_SESSION['diagnostic_gabarito'] = $gabarito;
    $_SESSION['diagnostic_category'] = $category;

    // Remover correct_answer antes de enviar ao cliente
    return array_map(function ($q, $i) {
        return [
            'id'      => $i + 1,
            'subject' => $q['subject'],
            'text'    => $q['text'],
            'options' => $q['options'],
        ];
    }, $questions, array_keys($questions));
}

$category = $_GET['category'] ?? 'Engenharia';
$questions = getQuestions($category);

echo json_encode(['success' => true, 'questions' => $questions, 'total' => count($questions)]);
