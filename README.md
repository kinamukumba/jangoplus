# Jango+ Sekulo

**Versão:** 2.0.0  
**Última Actualização:** 18 de Maio de 2026  
**Status:** Em Desenvolvimento Activo

> Plataforma web de gamificação e preparação para exames de acesso ao ensino superior em Angola. Disciplina, missão diária e consequência — com o Sekulo a guiar cada passo.

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Arquitectura do Projecto](#-arquitectura-do-projecto)
4. [Estrutura de Pastas](#-estrutura-de-pastas)
5. [Base de Dados](#-base-de-dados)
6. [API REST (Backend)](#-api-rest-backend)
7. [Principais Funcionalidades](#-principais-funcionalidades)
8. [Instalação e Configuração](#-instalação-e-configuração)
9. [Variáveis de Ambiente](#-variáveis-de-ambiente)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

**Jango+ Sekulo** é uma plataforma de preparação académica para estudantes angolanos que concorrem ao ensino superior. O sistema combina gamificação, inteligência artificial (Google Gemini) e pressão académica real para maximizar a preparação do candidato.

### O que é o Sekulo?
O Sekulo é o "mestre" da plataforma — uma persona severa, directa e profundamente focada que guia os estudantes com honestidade brutal. Gera roadmaps personalizados, missões diárias, quizzes e avalia simulados de acesso com veredictos sem rodeios.

### Público-alvo
Estudantes angolanos a preparar-se para exames de acesso às universidades nacionais (UAN, UCAN, etc.) nas áreas de Engenharia, Saúde, Ciências Sociais e Económicas.

---

## 🛠 Stack Tecnológico

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | HTML5 + Vanilla JS | Interface de utilizador |
| **Estilização** | Tailwind CSS (CDN) | Utilitários CSS + dark mode |
| **Tipografia** | Segoe UI (sistema) | Fonte nativa, sem dependências externas |
| **Backend** | PHP 8.x | API REST e lógica de negócio |
| **Base de Dados** | MySQL 8.x | Persistência de dados |
| **Servidor Local** | XAMPP (Apache + MySQL) | Ambiente de desenvolvimento |
| **IA Generativa** | Google Gemini 2.0 Flash | Roadmaps e veredictos dinâmicos |

---

## 🏗 Arquitectura do Projecto

### Padrão Geral
```
Browser (HTML + Vanilla JS)
        ↕  fetch() JSON
Backend PHP (API REST stateless)
        ↕  PDO
MySQL Database
```

### Autenticação
- Baseada em **sessões PHP** (`session_start()`)
- Login verifica `email + password_hash` na tabela `users`
- Todas as rotas protegidas verificam `$_SESSION['user_id']`
- Logout destrói a sessão com `session_destroy()`

### Geração de Conteúdo com IA
- O sistema tenta chamar a **Gemini 2.0 Flash API** para roadmaps personalizados, veredictos de simulados e feedback de missões
- Se a `GEMINI_API_KEY` não estiver configurada ou a API falhar, usa **fallbacks determinísticos** locais de alta qualidade
- Garante que a plataforma funciona 100% offline/sem chave de API

---

## 📁 Estrutura de Pastas

```
jangoplus/
├── index.html                        # Página de Login / Registo
│
├── utente/                           # Área autenticada do estudante
│   ├── dashboard.html                # Painel principal (XP, streak, missão)
│   ├── roadmap.html                  # Mapa de estudo personalizado
│   ├── sekulo.html                   # Quiz diário com o Sekulo
│   ├── simulado.html                 # Exame de acesso simulado (10 questões + timer)
│   ├── perfil.html                   # Perfil e estatísticas do utilizador
│   └── configuracoes.html            # Metas académicas e dados da conta
│
├── backend/
│   ├── config/
│   │   └── database.php              # Conexão PDO ao MySQL
│   └── api/
│       ├── auth/
│       │   ├── login.php             # POST /api/auth/login
│       │   ├── register.php          # POST /api/auth/register
│       │   └── logout.php            # POST /api/auth/logout
│       └── users/
│           ├── me.php                # GET  — dados básicos do utilizador
│           ├── stats.php             # GET  — estatísticas completas (XP, liga, etc.)
│           ├── onboard.php           # POST — onboarding + geração de roadmap
│           ├── roadmap.php           # GET  — roadmap personalizado do utilizador
│           ├── mission.php           # GET  — missão activa e quiz do dia
│           ├── submit_mission.php    # POST — submeter respostas do quiz diário
│           ├── simulado.php          # GET  — gerar simulado de 10 perguntas
│           ├── submit_simulado.php   # POST — corrigir simulado + veredicto Sekulo
│           ├── update_settings.php   # POST — actualizar perfil e metas
│           └── ranking.php           # GET  — ranking semanal e posição
│
├── assets/
│   ├── css/
│   │   └── style.css                 # Estilos globais (variáveis, utilitários base)
│   └── js/
│       ├── tailwind-config.js        # Configuração Tailwind (cores, fontes)
│       ├── app.js                    # Lógica JS principal (dashboard, quiz, simulado)
│       └── auth.js                   # Lógica JS de autenticação
│
├── database.sql                      # Schema completo da base de dados
├── .env                              # Variáveis de ambiente (não versionar!)
├── .env.example                      # Exemplo de configuração
└── README.md                         # Este ficheiro
```

---

## 🗄 Base de Dados

### Schema resumido (`database.sql`)

```sql
-- Utilizadores da plataforma
users (id, display_name, email, password_hash, created_at)

-- Estatísticas de gamificação (criadas automaticamente por trigger)
user_stats (user_id, xp_total, weekly_xp, current_streak, delay_days, league)

-- Dados de onboarding e metas académicas
user_onboarding (user_id, university, course_category, specific_course,
                 study_hours_day, motivation, exam_date)

-- Roadmap de estudo personalizado (6 nós gerados pela IA)
user_roadmap (id, user_id, order_num, topic, description, status, created_at)

-- Histórico de tentativas em exames e quizzes
exam_attempts (id, user_id, score_percentage, attempted_at)
```

### Liga / XP
| Liga | XP Mínimo |
|---|---|
| Bronze | 0 XP |
| Prata | 1 000 XP |
| Ouro | 3 000 XP |
| Diamante | *(reservado)* |
| Sekulo | *(reservado)* |

### Recompensas
| Evento | XP Ganho |
|---|---|
| Passar missão diária (quiz) | +150 XP |
| Aprovar simulado (≥ 70%) | +500 XP |

---

## 🔌 API REST (Backend)

Todas as rotas retornam `Content-Type: application/json`. As rotas marcadas com 🔒 requerem sessão activa.

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/backend/api/auth/register.php` | Registo de novo utilizador |
| `POST` | `/backend/api/auth/login.php` | Login com email + password |
| `POST` | `/backend/api/auth/logout.php` | 🔒 Terminar sessão |

### Utilizador
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/backend/api/users/me.php` | 🔒 Dados do utilizador autenticado |
| `GET` | `/backend/api/users/stats.php` | 🔒 Estatísticas completas + metas |
| `POST` | `/backend/api/users/onboard.php` | 🔒 Submeter onboarding e gerar roadmap |
| `POST` | `/backend/api/users/update_settings.php` | 🔒 Actualizar perfil ou metas |

### Roadmap e Missões
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/backend/api/users/roadmap.php` | 🔒 Roadmap personalizado |
| `GET` | `/backend/api/users/mission.php` | 🔒 Missão activa e 3 questões do quiz |
| `POST` | `/backend/api/users/submit_mission.php` | 🔒 Submeter respostas do quiz |

### Simulados
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/backend/api/users/simulado.php` | 🔒 Gerar exame de 10 questões (gabarito fica na sessão) |
| `POST` | `/backend/api/users/submit_simulado.php` | 🔒 Corrigir e obter veredicto do Sekulo |

### Ranking
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/backend/api/users/ranking.php` | 🔒 Top 10 semanal e posição do utilizador |

---

## 🎮 Principais Funcionalidades

### 1. Autenticação
- Registo e login com validação server-side
- Sessões PHP persistentes
- Logout no navbar (botão vermelho muted, último elemento)

### 2. Onboarding Personalizado
- Define universidade alvo, área de estudos, curso específico, horas de estudo diárias e motivação
- Gera automaticamente um roadmap de 6 módulos via **Gemini AI** ou fallback local

### 3. Roadmap de Estudo
- Visualização em linha do tempo (timeline)
- Módulos com estados: `locked`, `available`, `completed`
- Cada módulo desbloqueado ao passar o quiz correspondente

### 4. Missão Diária (Quiz com o Sekulo)
- 3 questões por módulo activo
- Gabarito guardado na sessão PHP (seguro contra trapaça)
- Feedback personalizado do Sekulo (aprovado/reprovado)
- +150 XP e desbloqueio do próximo módulo ao passar (≥ 2/3)

### 5. Simulados de Acesso Universitário
- **10 questões complexas** baseadas na área e universidade alvo do estudante
- Disciplinas por área:
  - **Engenharia:** Matemática (4), Física (4), Português (2)
  - **Saúde:** Biologia (4), Química (4), Física (1), Português (1)
  - **Sociais/Económicas:** Matemática/Geografia/História (8), Português (2)
- **Cronómetro de 20 minutos** com alerta vermelho nos últimos 2 min
- Submissão automática ao esgotar o tempo
- Gabarito 100% no servidor (sessão PHP) — nunca exposto ao cliente
- **Veredicto ácido e personalizado do Sekulo** com 5 níveis de severidade
- Revisão detalhada questão a questão após submissão
- +500 XP se aprovado (≥ 70%)

### 6. Perfil e Estatísticas
- XP total, liga, sequência activa, dias de atraso
- Taxa de acerto geral, módulos completados, simulados realizados
- Probabilidade de aprovação (baseada no histórico)

### 7. Ranking Competitivo
- Ranking semanal por XP
- Posição do utilizador + vizinhos acima e abaixo
- Ligas: Bronze → Prata → Ouro

### 8. Configurações
- Alterar nome de exibição e senha
- Actualizar metas académicas e regenerar roadmap

---

## 📦 Instalação e Configuração

### Pré-requisitos
- **XAMPP** (Apache + PHP 8.x + MySQL 8.x) instalado
- Navegador moderno (Chrome, Edge, Firefox)
- *(Opcional)* Chave de API do [Google Gemini](https://aistudio.google.com/apikey) para funcionalidades de IA dinâmicas

### Passo 1 — Colocar o projecto no XAMPP
```bash
# Copiar ou clonar o projecto para a pasta htdocs do XAMPP
# Windows:
C:\xampp\htdocs\jangoplus\
```

### Passo 2 — Criar a base de dados
```sql
-- No phpMyAdmin ou MySQL CLI:
CREATE DATABASE jangoplus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jangoplus;
-- Importar o ficheiro:
SOURCE C:/xampp/htdocs/jangoplus/database.sql;
```

Ou importar directamente via **phpMyAdmin → Import → database.sql**.

### Passo 3 — Configurar as variáveis de ambiente

Copiar `.env.example` para `.env` e preencher:

```env
# Base de Dados
DB_HOST=localhost
DB_NAME=jangoplus
DB_USER=root
DB_PASS=

# Gemini AI (opcional — a plataforma funciona sem esta chave)
GEMINI_API_KEY=sua_chave_aqui
```

### Passo 4 — Iniciar o XAMPP
- Abrir o **XAMPP Control Panel**
- Iniciar **Apache** e **MySQL**

### Passo 5 — Abrir no navegador
```
http://localhost/jangoplus/
```

---

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_HOST` | ✅ | Host da base de dados (normalmente `localhost`) |
| `DB_NAME` | ✅ | Nome da base de dados (`jangoplus`) |
| `DB_USER` | ✅ | Utilizador MySQL (`root` no XAMPP) |
| `DB_PASS` | ✅ | Password MySQL (vazia no XAMPP por defeito) |
| `GEMINI_API_KEY` | ❌ | Chave Google AI Studio para roadmaps e veredictos dinâmicos |

> **Sem `GEMINI_API_KEY`:** A plataforma usa fallbacks determinísticos locais. Todas as funcionalidades continuam a funcionar — roadmaps e veredictos são gerados com bancos de conteúdo pré-definidos de alta qualidade.

---

## 🎨 Design System

| Elemento | Valor |
|---|---|
| **Modo** | Dark mode (por defeito, classe `dark` no `<html>`) |
| **Tipografia** | Segoe UI (sistema Windows), sem dependências externas |
| **Paleta** | OKLCH — contraste alto, dark premium |
| **Framework CSS** | Tailwind CSS (CDN, v3 config) |
| **Cor primária** | `oklch(0.97 0.005 80)` — branco quente |
| **Cor de fundo** | `oklch(0.14 0.005 60)` — quase preto |
| **Cor destrutiva** | `oklch(0.58 0.22 25)` — vermelho muted |
| **Cor de sucesso** | `oklch(0.68 0.15 145)` — verde suave |

### Responsividade
- **Mobile (`< 768px`):** Navegação na barra inferior, layout em coluna única
- **Desktop (`≥ 768px`):** Sidebar fixa à esquerda (256px), conteúdo em grelha de 12 colunas

---

## 🐛 Troubleshooting

### Página em branco ou erros de sessão
```bash
# Verificar se o Apache e MySQL estão activos no XAMPP
# Verificar se o ficheiro .env existe e tem os valores correctos
```

### Erro de conexão à base de dados
```bash
# Testar acesso: http://localhost/phpmyadmin
# Verificar credenciais em backend/config/database.php
```

### Roadmap não gera / Simulado sem questões
- Se a `GEMINI_API_KEY` estiver inválida, o sistema usa o fallback local automaticamente
- Verificar que o onboarding foi concluído (universidade + área + curso preenchidos)

### Sessão expira rapidamente
- Verificar `session.gc_maxlifetime` no `php.ini` do XAMPP
- Valor recomendado: `7200` (2 horas)

### Apache não inicia (porta 80 ocupada)
```bash
# Alterar a porta do Apache no XAMPP para 8080
# E aceder via: http://localhost:8080/jangoplus/
```

---

## 📝 Notas de Desenvolvimento

### Adicionar novas questões ao banco local
Editar `backend/api/users/simulado.php`, função `generateDeterministicSimulado()`. As questões são organizadas por `$courseCategory` com o seguinte formato:

```php
[
  'subject' => 'Matemática',
  'text' => 'Enunciado da questão...',
  'options' => ['A) Opção A', 'B) Opção B', 'C) Opção C', 'D) Opção D'],
  'correct_answer' => 'B'
]
```

### Personalizar o tom do Sekulo
Os veredictos determinísticos estão em `backend/api/users/submit_simulado.php`, função `getDeterministicVerdict()`. Os veredictos Gemini são controlados pelo prompt em `getGeminiVerdict()`.

### Data do exame
Configurável directamente no `dashboard.html` via o campo `exam_date` no onboarding. O número de dias restantes é calculado dinamicamente em `app.js`.

---

## 🔐 Segurança

| Medida | Implementação |
|---|---|
| Passwords | `password_hash()` + `password_verify()` (bcrypt) |
| SQL Injection | PDO com prepared statements em todas as queries |
| Anti-trapaça | Gabarito dos quizzes e simulados guardado na sessão PHP (nunca enviado ao cliente) |
| Sessões | `session_start()` + verificação de `$_SESSION['user_id']` em todas as rotas protegidas |

---

## 🚀 Roadmap do Projecto

- [x] Autenticação (Login / Registo)
- [x] Onboarding com geração de Roadmap (Gemini + Fallback)
- [x] Quiz diário com o Sekulo
- [x] Sistema de XP, ligas e ranking
- [x] Layout responsivo (Sidebar PC / Bottom nav Mobile)
- [x] Simulados de Acesso Universitário (10 questões + timer + veredicto)
- [x] Tipografia nativa (Segoe UI)
- [x] Botão de Sair unificado no navbar
- [ ] Notificações push / lembretes de missão
- [ ] Exportação de relatório de progresso (PDF)
- [ ] Modo offline com Service Worker

---

**Jango+ Sekulo** — *Disciplina, Missão e Consequência.*
