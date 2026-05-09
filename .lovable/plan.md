
# Jango+ — Pacote "Aluno primeiro" (1–7)

Foco: transformar o dashboard atual em campo de treino. Admin fica para entrega seguinte.

---

## 1. Sekulo reativo (mentor contextual)

Criar `src/lib/sekulo-brain.ts` com função `pickContextualMessage(ctx)` que recebe um snapshot do aluno e devolve uma frase priorizada por urgência.

**Sinais usados** (já existem em `user_stats`, `mission_attempts`, `daily_missions`, `exam_attempts`, `rank_snapshots`):
- `delay_days`, `current_streak`, `last_completed_date`
- delta de ranking vs último snapshot
- delta de acerto por disciplina (últimos 7 dias vs 7 anteriores)
- último simulado: subiu/desceu

**Regras de prioridade** (primeira que bater ganha):
1. ≥3 dias sem entrar → "X dias perdido. Os outros continuam."
2. Caiu ≥2 posições → "Estás a perder posição."
3. Subiu de liga ou top 10 → "Subiste. Agora sustenta."
4. Disciplina melhorou ≥15pp → "Física deixou de ser teu problema."
5. Disciplina caiu ≥10pp → "Estás a perder consistência em [X]."
6. Streak ≥7 → "7 dias seguidos. Continua."
7. Default → fallback atual `homeMessage(state)`.

Substituir o bloco fixo no Home, Resultado e Ranking pela mesma função.

---

## 2. Loop de retenção

Adicionar em `src/lib/retention.ts`:
- `urgencyForToday(stats, rank, mission)` → devolve `{level: 'critical'|'warn'|'ok', reason}`.
- Banner fino no topo do Home quando `critical` (ex: "Se falhares hoje, cais 2 posições") usando `previewRankIfMissedToday()` (nova RPC: simula -1 dia sem XP).

Micro-vitórias: cada bloco de tópico concluído dispara toast com "+X XP · bloco terminado".

---

## 3. Ranking dinâmico

Estender `src/lib/ranking.ts`:
- `fetchNeighbors(userId)` → 2 acima e 2 abaixo (já temos posição via RPC, basta query por `weekly_xp` ordenada).
- `fetchOvertaken(userId)` → diff entre snapshot anterior e ranking atual; lista nomes ultrapassados.
- `riskOfDropToday(userId)` → quantas posições cai se ninguém mais ganhar XP além de quem está abaixo (estimativa baseada em XP médio diário dos vizinhos).

UI em `/ranking` e card no Home:
- Strip "↑ Mateus +12 XP · estás a 32 XP" (vizinho de cima).
- "Risco hoje: -2 posições" se aplicável.
- Lista de "Ultrapassaste: [nomes]" quando houver delta positivo.

---

## 4. Micro-progressão por tópico

**Lista curada** em `src/lib/topics.ts`:
```
MAT: ["Funções","Derivadas","Geometria","Álgebra","Revisão"]
FIS: ["Cinemática","Dinâmica","Eletricidade","Ondas","Revisão"]
QUI: ["Estequiometria","Soluções","Orgânica","Termoquímica","Revisão"]
BIO: ["Citologia","Genética","Fisiologia","Ecologia","Revisão"]
LP:  ["Interpretação","Gramática","Redação","Revisão"]
```

Migration: backfill `questions.topic` onde for NULL atribuindo "Revisão" e garantir que questões existentes mantêm topic. Não criar tabela nova — agrupar em runtime.

`getOrCreateTodayMission` continua a definir targets por disciplina; novo helper `splitMissionIntoBlocks(mission, questions)` divide a fila por `(subject, topic)` em blocos de 3–5 questões.

UI da missão (`/missao`):
- Header da questão mostra "MAT · Funções · 2/4".
- Ao terminar bloco: ecrã intermédio "Bloco terminado · +XP · próximo: Derivadas".
- Home mostra árvore: disciplina → blocos com barras individuais.

---

## 5. Evolução real

`src/lib/evolution.ts`:
- `subjectAccuracyTrend(userId, subject)` → últimos 14 dias agrupados por dia, % acerto.
- `weeklyComparison(userId)` → semana atual vs anterior por disciplina.

Nova rota `/evolucao` (link no Home):
- Sparklines (Recharts já está nas deps via shadcn/chart) por disciplina.
- Linhas tipo "Física: 42% → 71%" calculadas de janelas de 7 dias.
- Gráfico geral de XP/dia (14 dias).

---

## 6. Probabilidade de aprovação (baseada em simulados)

`src/lib/approval.ts`:
- `approvalProbability(userId)`:
  - Se <2 simulados: devolve `null` ("Faz mais um simulado para saber").
  - Caso contrário: média ponderada dos últimos 5 simulados (peso decrescente). Mapeia score → tier:
    - ≥70% → verde "Forte"
    - 50–69% → amarelo "Em risco"
    - <50% → vermelho "Crítico"

Card no Home (acima do ranking) com semáforo + valor + "Baseado em N simulados".

---

## 7. Feedback pós-missão melhorado

Refatorar `/resultado`:
- Hero: XP grande + delta de posição (já existe DeltaBadge).
- Nova secção "Disciplina mais forte / mais fraca" calculada das % por disciplina desta missão.
- "Maior melhoria desta semana" (compara score desta missão com média 7 dias).
- Mensagem do Sekulo passa pelo `pickContextualMessage` em vez do `resultMessage` atual.

---

## Detalhes técnicos

**Migrations**:
1. Backfill `questions.topic` (UPDATE onde NULL).
2. Nova RPC `get_rank_neighbors(_user_id, _radius int)` devolvendo até 2 acima/abaixo com display_name e weekly_xp.
3. (Opcional) view `daily_accuracy` agregando `mission_attempts` por dia/disciplina para acelerar gráficos.

**Sem mudanças**: schema de `user_stats`, `daily_missions`, `exams` (já tem tudo).

**Componentes novos**:
- `src/components/sekulo/UrgencyBanner.tsx`
- `src/components/sekulo/NeighborStrip.tsx`
- `src/components/sekulo/ApprovalGauge.tsx`
- `src/components/sekulo/BlockProgress.tsx`
- `src/routes/evolucao.tsx`

**Memória**: gravar regras de tom do Sekulo (sem motivação vazia, frases curtas, sempre com ação) em `mem://design/sekulo-voice` para aplicar em entregas futuras.

---

## Fora do scope desta entrega

- Conta admin, métricas globais, alertas (itens 8–11) — próxima entrega, com lista de emails permitidos via env `ADMIN_EMAILS`.
- Realtime updates (continuar com refetch on focus).
- Internacionalização.

Confirmas para avançar?
