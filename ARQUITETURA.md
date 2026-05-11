# 🏗 Arquitetura Visual - Jango+ Sekulo

## Fluxo de Requisição

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER / CLIENT                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 19                                                │   │
│  │  ├─ Router: TanStack Router (File-based)               │   │
│  │  ├─ State: React Context (Auth) + React Query (async)  │   │
│  │  ├─ UI: Radix + Tailwind CSS                           │   │
│  │  └─ Forms: React Hook Form + Zod validation            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│                         TypeScript                               │
│                              ↓                                    │
│                          Vite Dev Server                         │
│                      (Hot Module Reload)                         │
│                          Port 5173                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Requests (JSON/REST)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Auth Layer                                              │   │
│  │  ├─ JWT Tokens                                          │   │
│  │  ├─ Session Management                                 │   │
│  │  └─ OAuth Support (Google, etc)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Realtime Database (PostgreSQL)                          │   │
│  │  ├─ users_stats                                         │   │
│  │  ├─ daily_missions                                      │   │
│  │  ├─ exam_attempts                                       │   │
│  │  ├─ ranking_snapshots                                   │   │
│  │  ├─ user_leagues                                        │   │
│  │  └─ ... (ver migrations)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│                    API Client (supabase-js)                      │
│                                                                   │
│  Project ID: iuqxhcgmywbrpcnflrbc                               │
│  URL: https://iuqxhcgmywbrpcnflrbc.supabase.co                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE WORKERS (EDGE)                       │
│  ├─ TanStack Start SSR                                          │
│  ├─ Global deployment                                           │
│  └─ Wrangler CLI                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Componentes

```
src/
├── routes/                    🗂️ Páginas (File-based routing)
│   ├── __root.tsx            📄 Layout raiz + HTML
│   ├── index.tsx             📄 Home/Dashboard
│   ├── auth.tsx              📄 Autenticação
│   ├── missao.tsx            📄 Missão diária
│   ├── treino.tsx            📄 Sistema treino
│   ├── ranking.tsx           📄 Ranking
│   ├── simulado.*.tsx        📄 Exames/simulados
│   └── evolucao.tsx          📄 Progresso
│
├── components/
│   ├── ui/                   🎨 Radix UI (base)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   └── ... (30+ componentes)
│   │
│   └── sekulo/               🎮 Componentes de negócio
│       ├── ApprovalGauge     📊 Medidor aprovação
│       ├── XPBar            ✨ Barra XP
│       ├── LeagueBadge      🏆 Liga/divisão
│       ├── Stat             📈 Estatísticas
│       └── ... (7+ componentes)
│
├── lib/                      💡 Lógica de negócio
│   ├── auth-context.tsx     🔐 Autenticação global
│   ├── sekulo-config.ts     ⚙️  Configurações
│   ├── mission.ts           📋 Missões
│   ├── ranking.ts           🏅 Rankings
│   ├── progression.ts       📈 Progressão
│   ├── exams.ts            📝 Simulados
│   ├── goals.ts            🎯 Objetivos
│   ├── leagues.ts          📊 Divisões
│   ├── evolution.ts        📉 Evolução
│   ├── approval.ts         ✅ Aprovação
│   ├── bloom.ts            🌱 Spaced repetition
│   ├── topics.ts           📚 Tópicos
│   ├── sekulo-brain.ts     🧠 IA/Algoritmos
│   ├── sekulo-voice.ts     🗣️  Mensagens
│   └── utils.ts            🔧 Funções uteis
│
├── hooks/                    🪝 Custom React Hooks
│   └── use-mobile.tsx       📱 Detectar mobile
│
├── integrations/             🔌 Serviços externos
│   └── supabase/
│       └── client.ts        🗄️  Cliente Supabase
│
└── assets/                   📦 Mídia estática
    ├── images/
    └── icons/
```

---

## Fluxo de Dados - Exemplo: Missão Diária

```
1. Utilizador clica "Aceitar Missão"
                    ↓
2. React Hook Form valida com Zod
                    ↓
3. React Query executa mutação
                    ↓
4. Supabase client envia HTTP POST
   POST https://iuqxhcgmywbrpcnflrbc.supabase.co/rest/v1/daily_missions
                    ↓
5. Supabase autentifica com JWT
                    ↓
6. PostgreSQL insere/atualiza registro
   INSERT INTO daily_missions (user_id, date, mission_data)
                    ↓
7. Realtime notifica client
   (WebSocket subscription)
                    ↓
8. React Query atualiza cache
                    ↓
9. UI re-renderiza com novo estado
   (ApprovalGauge, XPBar, etc)
                    ↓
10. Sonner mostra toast de sucesso
```

---

## Stack de Dependências

```
┌──────────────────────────────────────────────────┐
│           APLICAÇÃO (React 19 + TS)              │
├──────────────────────────────────────────────────┤
│ TanStack Router (Roteamento)                     │
│ TanStack React Query (Dados async)               │
│ TanStack Start (Meta-framework SSR)              │
├──────────────────────────────────────────────────┤
│ React Hook Form (Formulários)                    │
│ Zod (Validação)                                  │
├──────────────────────────────────────────────────┤
│ Tailwind CSS 4 (Estilos)                         │
│ Radix UI (Componentes unstyled)                  │
│ Lucide React (Ícones)                            │
│ Sonner (Notificações)                            │
│ Recharts (Gráficos)                              │
│ Embla Carousel (Carrossel)                       │
│ date-fns (Datas)                                 │
├──────────────────────────────────────────────────┤
│ Supabase JS (Backend client)                     │
├──────────────────────────────────────────────────┤
│ Vite (Build tool)                                │
│ TypeScript (Tipagem)                             │
│ ESLint + Prettier (Code quality)                 │
│ Cloudflare Plugin (Edge deployment)              │
└──────────────────────────────────────────────────┘
```

---

## Ciclo de Vida da Aplicação

```
1. BOOT
   ├─ Vite inicia dev server
   ├─ TypeScript compila
   └─ Hot reload ativo (localhost:5173)

2. INIT
   ├─ Root layout renderiza (__root.tsx)
   ├─ AuthProvider inicia
   ├─ QueryClientProvider inicia
   └─ Supabase verifica sessão existente

3. AUTH
   ├─ useAuth() verifica se tem sessão
   ├─ Se não tem → redireciona para /auth
   ├─ Se tem → carrega dados do utilizador
   └─ JWT token armazenado em localStorage

4. DATA FETCH
   ├─ useQuery() busca dados iniciais
   ├─ Supabase retorna dados via REST
   ├─ React Query cachea resultados
   └─ Realtime subscriptions ativadas

5. RENDER
   ├─ Componentes renderizam
   ├─ UI atualiza com dados
   └─ Event listeners prontos

6. INTERACTION
   ├─ Utilizador interage
   ├─ Mutações executam
   ├─ Server atualiza
   └─ Realtime notifica clientes

7. UPDATE
   ├─ React Query invalida cache
   ├─ useQuery() refetch automático
   ├─ Componentes re-renderizam
   └─ Toast mostra resultado
```

---

## Tipagem TypeScript

```
src/
├── types/                    (se existisse)
│   ├── user.ts             User | Session
│   ├── mission.ts          DailyMission | MissionState
│   ├── ranking.ts          RankingData | UserStats
│   ├── exam.ts             ExamAttempt | ExamResult
│   └── ...
│
└── lib/
    └── (tipos inline nos arquivos)
        ├── mission.ts      export type UserStats, DailyMission
        ├── ranking.ts      export type RankingSnapshot
        └── ...

Configurado em tsconfig.json:
├─ target: ES2022
├─ strict: true          (tipagem rigorosa)
├─ moduleResolution: Bundler
└─ paths: "@/*" → "./src/*"
```

---

## Variáveis de Ambiente

```
.env.local (LOCAL DEV)
├─ VITE_SUPABASE_URL
├─ VITE_SUPABASE_ANON_KEY
├─ VITE_CLOUDFLARE_ACCOUNT_ID (optional)
└─ VITE_CLOUDFLARE_API_TOKEN (optional)

.env.production (CLOUDFLARE)
├─ SUPABASE_URL (sem VITE_)
├─ SUPABASE_ANON_KEY
└─ NODE_ENV=production

Nota: VITE_ é necessário no frontend para
injetar variáveis no bundle do Vite
```

---

## Deploy Pipeline

```
Local Dev
    ↓ (git commit)
Repository
    ↓ (git push)
Cloudflare Workers
    ├─ Vite build
    ├─ TanStack Start SSR
    ├─ Node.js compat layer
    └─ Global edge deployment
    ↓
CDN (Cloudflare Edge)
    ├─ Geographically distributed
    ├─ Fast TTL
    └─ Low latency
    ↓
Users (Global)
```

---

## Migrações SQL (Supabase)

```
supabase/migrations/
├─ 20260420142155_*.sql     Criar tabelas base
├─ 20260420150310_*.sql     Adicionar campos
├─ 20260420150440_*.sql     Criar índices
├─ 20260421162355_*.sql     Adicionar constraints
├─ 20260421165203_*.sql     Mais alterações
├─ 20260422154816_*.sql     Dados iniciais
├─ 20260422155304_*.sql     Otimizações
├─ 20260504183953_*.sql     Correções
├─ 20260508161302_*.sql     Novos campos
└─ 20260509175251_*.sql     Últimas mudanças

Executadas automaticamente pelo Supabase
CLI ou dashboard
```

---

## Build Output

```
npm run build
    ↓
dist/
├─ index.html              Entry point
├─ assets/
│   ├─ index-HASH.js      Bundle principal (Tree-shaking)
│   ├─ index-HASH.css     CSS otimizado (Tailwind purged)
│   └─ ... (chunks)
├─ _functions/             Server functions (SSR)
│   └─ ...
└─ .wrangler/             Cloudflare config
    └─ ...

Otimizações:
├─ Tree-shaking (código morto removido)
├─ Code splitting (chunks por rota)
├─ Minificação (JS/CSS/HTML)
├─ Source maps (para debugging)
└─ Asset hashing (cache busting)
```

---

## Performance

```
Métricas esperadas:
├─ LCP (Largest Contentful Paint): < 2.5s
├─ FID (First Input Delay): < 100ms
├─ CLS (Cumulative Layout Shift): < 0.1
├─ TTI (Time to Interactive): < 3.8s
└─ FCP (First Contentful Paint): < 1.8s

Otimizações aplicadas:
├─ React 19 (mais rápido)
├─ TanStack Start (SSR)
├─ Tailwind 4 (CSS menor)
├─ Code splitting (menos JS)
├─ Cloudflare Edge (latência baixa)
└─ Supabase realtime (menos polling)
```

---

**Diagrama Visual Completo da Arquitetura do Jango+ Sekulo**

