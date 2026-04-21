
-- 1. Nova disciplina LP
INSERT INTO public.subjects (code, name, daily_target)
VALUES ('LP', 'Língua Portuguesa', 8)
ON CONFLICT DO NOTHING;

-- 2. Dificuldade nas questões (opcional, default medium)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium';

-- 3. Metas e score de LP na missão diária
ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS lp_target integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS score_lp numeric;

-- 4. Índice para detectar repetição recente
CREATE INDEX IF NOT EXISTS idx_mission_attempts_user_q_ans
  ON public.mission_attempts (user_id, question_id, answered_at DESC);

-- 5. Banco de questões: LP (gramática, interpretação, vocabulário)
WITH s AS (SELECT id FROM public.subjects WHERE code = 'LP')
INSERT INTO public.questions (subject_id, statement, options, correct_index, explanation, difficulty)
SELECT s.id, v.statement, v.options::jsonb, v.correct_index, v.explanation, v.difficulty
FROM s, (VALUES
  -- Acentuação
  ('Qual das palavras está corretamente acentuada?',
   '["facil","facíl","fácil","faciL"]', 2,
   'Palavras paroxítonas terminadas em -l são acentuadas: fácil.', 'easy'),
  ('Assinala a palavra com acento incorreto:',
   '["história","médico","bébé","caráter"]', 2,
   'Com o Acordo Ortográfico escreve-se "bebé" (sem trema/erro) — "bébé" tem acento a mais no 1º e.', 'medium'),
  ('A palavra "saída" leva acento porque:',
   '["é proparoxítona","o i forma hiato tónico","termina em vogal","é estrangeira"]', 1,
   'O i tónico após vogal forma hiato e é acentuado.', 'medium'),
  -- Concordância
  ('Assinala a frase com concordância correta:',
   '["Houveram muitos alunos na sala.","Houve muitos alunos na sala.","Havia muito alunos.","Há de haverem problemas."]', 1,
   'O verbo "haver" no sentido de existir é impessoal: fica sempre no singular.', 'medium'),
  ('Escolhe a forma correta:',
   '["Fazem dez anos que estudo.","Faz dez anos que estudo.","Fazeram dez anos.","Fazia dez anos que estudavam."]', 1,
   'Verbo "fazer" indicando tempo é impessoal: fica no singular.', 'medium'),
  ('Qual frase respeita a concordância nominal?',
   '["Os alunos estudiosos foi premiado.","Os alunos estudiosos foram premiados.","O aluno estudiosos foram premiado.","Os aluno estudioso foi premiados."]', 1,
   'Sujeito plural exige verbo e predicativo no plural.', 'easy'),
  -- Pontuação
  ('Assinala a frase com pontuação correta:',
   '["Maria que é minha irmã chegou.","Maria, que é minha irmã, chegou.","Maria que, é minha irmã chegou.","Maria, que é minha irmã chegou."]', 1,
   'Oração subordinada adjetiva explicativa é isolada por vírgulas.', 'medium'),
  ('Onde falta vírgula?',
   '["Ontem fui à escola.","João estuda Ana trabalha.","Comprei pão, leite e ovos.","Ele chegou cedo hoje."]', 1,
   'Orações coordenadas separadas por vírgula: "João estuda, Ana trabalha."', 'medium'),
  -- Vocabulário / sinónimos / antónimos
  ('Sinónimo mais próximo de "efémero":',
   '["eterno","passageiro","sólido","antigo"]', 1,
   '"Efémero" significa de curta duração — passageiro.', 'medium'),
  ('Antónimo de "prudente":',
   '["cauteloso","sensato","imprudente","discreto"]', 2,
   'Antónimo de prudente é imprudente.', 'easy'),
  ('Significado de "perspicaz":',
   '["lento","observador e arguto","preguiçoso","tímido"]', 1,
   'Perspicaz = que percebe rapidamente, argúcia.', 'hard'),
  ('"Austero" significa:',
   '["alegre","severo, rigoroso","generoso","colorido"]', 1,
   'Austero = severo, rigoroso, sóbrio.', 'hard'),
  -- Classes de palavras
  ('Na frase "Ele corre rapidamente", "rapidamente" é:',
   '["adjetivo","advérbio","substantivo","pronome"]', 1,
   'Modifica o verbo correr → advérbio de modo.', 'easy'),
  ('Qual é um pronome possessivo?',
   '["este","meu","quem","alguém"]', 1,
   '"Meu" indica posse → pronome possessivo.', 'easy'),
  -- Interpretação
  ('Lê: "Apesar do cansaço, continuou a estudar até tarde." A relação entre as orações é de:',
   '["causa","concessão","finalidade","tempo"]', 1,
   '"Apesar de" introduz concessão — admite obstáculo.', 'medium'),
  ('Lê: "Estudou tanto que passou com distinção." A oração subordinada exprime:',
   '["causa","consequência","condição","comparação"]', 1,
   '"Tanto... que" introduz consequência.', 'medium'),
  ('"O livro, cuja capa é vermelha, é meu." A palavra "cuja" é:',
   '["pronome pessoal","pronome relativo","conjunção","advérbio"]', 1,
   '"Cuja" é pronome relativo que indica posse.', 'hard'),
  ('Identifica o sujeito em: "Chegaram cedo os convidados."',
   '["Chegaram","cedo","os convidados","não há sujeito"]', 2,
   'Sujeito posposto: "os convidados".', 'medium'),
  -- Plural
  ('Plural de "cidadão":',
   '["cidadões","cidadãos","cidadãs","cidadans"]', 1,
   'Cidadão → cidadãos.', 'easy'),
  ('Plural de "mal" (substantivo):',
   '["mais","maus","males","malais"]', 2,
   'Substantivo "mal" → "males" (ex.: os males do mundo).', 'medium')
) AS v(statement, options, correct_index, explanation, difficulty);

-- 6. Mais questões de BIO
WITH s AS (SELECT id FROM public.subjects WHERE code = 'BIO')
INSERT INTO public.questions (subject_id, statement, options, correct_index, explanation, difficulty)
SELECT s.id, v.statement, v.options::jsonb, v.correct_index, v.explanation, v.difficulty
FROM s, (VALUES
  ('Qual destes organelos produz ATP?',
   '["Ribossoma","Mitocôndria","Complexo de Golgi","Lisossoma"]', 1,
   'A mitocôndria é o local principal da respiração celular e produção de ATP.', 'easy'),
  ('A mitose resulta em:',
   '["2 células haploides","4 células haploides","2 células diploides iguais","4 células diploides"]', 2,
   'Mitose = 2 células diploides geneticamente idênticas.', 'medium'),
  ('O material genético está contido:',
   '["No citoplasma","No núcleo","Na membrana","No retículo"]', 1,
   'Em células eucariotas o DNA está no núcleo.', 'easy'),
  ('Quem fagocita agentes patogénicos?',
   '["Eritrócitos","Macrófagos","Plaquetas","Osteoblastos"]', 1,
   'Macrófagos realizam fagocitose.', 'medium'),
  ('A fotossíntese produz:',
   '["CO2 e água","O2 e glicose","ATP e lactato","N2 e glicose"]', 1,
   'Produz oxigénio e glicose a partir de CO2 e água.', 'easy'),
  ('O transporte passivo contra gradiente requer:',
   '["ATP","Não ocorre contra gradiente","Difusão simples","Ósmose"]', 1,
   'Transporte passivo é sempre a favor do gradiente; contra gradiente é activo.', 'hard'),
  ('Qual é a função principal do DNA?',
   '["Catalisar reações","Armazenar informação genética","Transporte de O2","Sustentação"]', 1,
   'DNA armazena e transmite informação genética.', 'easy')
) AS v(statement, options, correct_index, explanation, difficulty);

-- 7. Mais questões de QUI
WITH s AS (SELECT id FROM public.subjects WHERE code = 'QUI')
INSERT INTO public.questions (subject_id, statement, options, correct_index, explanation, difficulty)
SELECT s.id, v.statement, v.options::jsonb, v.correct_index, v.explanation, v.difficulty
FROM s, (VALUES
  ('A massa molar da água (H2O) é aproximadamente:',
   '["10 g/mol","18 g/mol","32 g/mol","44 g/mol"]', 1,
   '2(1) + 16 = 18 g/mol.', 'easy'),
  ('Ácido forte típico:',
   '["CH3COOH","HCl","NH3","H2CO3"]', 1,
   'HCl dissocia-se completamente em água.', 'easy'),
  ('pH de uma solução neutra a 25 °C:',
   '["0","7","14","1"]', 1,
   'pH = 7 é neutro.', 'easy'),
  ('Qual ligação une Na e Cl no NaCl?',
   '["Covalente apolar","Iónica","Metálica","Hidrogénio"]', 1,
   'Metal + não-metal → ligação iónica.', 'medium'),
  ('Isótopos diferem em:',
   '["nº protões","nº neutrões","nº eletrões","carga"]', 1,
   'Isótopos têm mesmos protões e diferentes neutrões.', 'medium'),
  ('Reação exotérmica:',
   '["Absorve calor","Liberta calor","Não envolve calor","Só ocorre no vácuo"]', 1,
   'Exotérmica liberta energia.', 'easy'),
  ('Número de oxidação do H em HCl:',
   '["-1","0","+1","+7"]', 2,
   'Com não-metais mais electronegativos, H tem +1.', 'hard')
) AS v(statement, options, correct_index, explanation, difficulty);

-- 8. Mais questões de FIS
WITH s AS (SELECT id FROM public.subjects WHERE code = 'FIS')
INSERT INTO public.questions (subject_id, statement, options, correct_index, explanation, difficulty)
SELECT s.id, v.statement, v.options::jsonb, v.correct_index, v.explanation, v.difficulty
FROM s, (VALUES
  ('Unidade SI de força:',
   '["Joule","Newton","Watt","Pascal"]', 1,
   'Força em SI é newton (N).', 'easy'),
  ('Velocidade média = ?',
   '["força/massa","distância/tempo","massa*aceleração","trabalho/tempo"]', 1,
   'v = d/t.', 'easy'),
  ('Primeira lei de Newton refere:',
   '["F=ma","inércia","ação-reação","gravidade"]', 1,
   'Corpo mantém o seu estado se não houver força resultante.', 'medium'),
  ('Energia cinética depende de:',
   '["massa e velocidade","só massa","só posição","só tempo"]', 0,
   'Ec = 1/2 m v².', 'medium'),
  ('Unidade de potência:',
   '["N","J","W","Pa"]', 2,
   'Watt = J/s.', 'easy'),
  ('Um objeto em queda livre tem aceleração aproximadamente:',
   '["0","5 m/s²","9,8 m/s²","20 m/s²"]', 2,
   'g ≈ 9,8 m/s² junto à superfície da Terra.', 'easy'),
  ('Se a força triplica e a massa é constante, a aceleração:',
   '["mantém-se","duplica","triplica","reduz a 1/3"]', 2,
   'a = F/m; se F triplica, a triplica.', 'medium')
) AS v(statement, options, correct_index, explanation, difficulty);

-- 9. Mais questões de REV (transversais)
WITH s AS (SELECT id FROM public.subjects WHERE code = 'REV')
INSERT INTO public.questions (subject_id, statement, options, correct_index, explanation, difficulty)
SELECT s.id, v.statement, v.options::jsonb, v.correct_index, v.explanation, v.difficulty
FROM s, (VALUES
  ('Qual destes é um não-metal?',
   '["Fe","Cu","S","Na"]', 2,
   'Enxofre (S) é não-metal.', 'easy'),
  ('Órgão responsável pelas trocas gasosas:',
   '["Estômago","Pulmão","Fígado","Rim"]', 1,
   'A hematose ocorre nos pulmões.', 'easy'),
  ('Um movimento uniforme tem:',
   '["aceleração constante ≠ 0","velocidade constante","velocidade nula","força resultante elevada"]', 1,
   'Uniforme → velocidade constante, a = 0.', 'medium'),
  ('Principal gás responsável pelo efeito de estufa reforçado:',
   '["O2","N2","CO2","H2"]', 2,
   'CO2 é o principal contribuinte antropogénico.', 'easy'),
  ('A água pura tem ponto de ebulição (1 atm):',
   '["0 °C","50 °C","100 °C","200 °C"]', 2,
   '100 °C a 1 atm.', 'easy')
) AS v(statement, options, correct_index, explanation, difficulty);
