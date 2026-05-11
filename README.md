# Documentação Técnica - Jango+ Sekulo

**Data de Geração:** 11 de Maio de 2026  
**Versão do Projeto:** 1.0.0  
**Status:** Em Desenvolvimento

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitetura do Projeto](#arquitetura-do-projeto)
4. [Requisitos do Sistema](#requisitos-do-sistema)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Execução do Projeto](#execução-do-projeto)
7. [Estrutura de Pastas](#estrutura-de-pastas)
8. [Principais Funcionalidades](#principais-funcionalidades)
9. [Base de Dados](#base-de-dados)
10. [Scripts Disponíveis](#scripts-disponíveis)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

**Jango+ — Sekulo** é uma plataforma web de **gamificação e treinamento académico** com foco em preparação para exames. O projeto combina:

- 🎮 **Sistema de gamificação** com XP, rankings e missões diárias
- 📚 **Módulos de treino** organizados por disciplina e tópico
- 📊 **Estatísticas e acompanhamento** de progresso do utilizador
- 🏆 **Ranking competitivo** entre utilizadores
- ⚡ **Interface moderna e responsiva**

**Público-alvo:** Estudantes que preparam-se para exames (ex.: exame final em 30 de Novembro de 2026)

**Missão:** Disciplina, missão diária e consequência para preparação académica efectiva

---

## 🛠 Stack Tecnológico

### Frontend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **React** | 19.2.0 | Framework UI principal |
| **TypeScript** | 5.8.3 | Tipagem estática |
| **TanStack Router** | 1.168.0 | Roteamento declarativo (File-based routing) |
| **TanStack React Start** | 1.167.14 | Framework meta (Server-Side Rendering) |
| **TanStack React Query** | 5.83.0 | Gestão de estado assíncrono |
| **Tailwind CSS** | 4.2.1 | Estilização utilitária |
| **Radix UI** | Múltiplas (v1.x) | Componentes unstyled e acessíveis |
| **React Hook Form** | 7.71.2 | Gestão de formulários |
| **Zod** | 3.24.2 | Validação de esquemas TypeScript |

### Backend / Infraestrutura
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **Supabase** | 2.104.0 | Backend-as-a-Service (PostgreSQL + Auth + Realtime) |
| **Cloudflare Workers** | Via Vite Plugin | Deployment edge computing |
| **Wrangler** | Config presente | CLI para Cloudflare |

### Desenvolvimento
| Ferramenta | Versão | Função |
|-----------|--------|--------|
| **Vite** | 7.3.1 | Build tool e dev server |
| **Bun** | Lockfile presente | Gestor de pacotes/runtime |
| **ESLint** | 9.32.0 | Linting JavaScript/TypeScript |
| **Prettier** | 3.7.3 | Code formatter |
| **@lovable.dev/vite-tanstack-config** | 1.4.0 | Config pré-configurada TanStack |

### UI & UX
| Biblioteca | Versão | Função |
|-----------|--------|--------|
| **Lucide React** | 0.575.0 | Ícones SVG |
| **Recharts** | 2.15.4 | Gráficos e visualizações |
| **Sonner** | 2.0.7 | Notificações toast |
| **Embla Carousel** | 8.6.0 | Componentes carousel |
| **React Day Picker** | 9.14.0 | Seletor de datas |
| **date-fns** | 4.1.0 | Manipulação de datas |
| **Class Variance Authority** | 0.7.1 | Variantes de componentes |

---

## 🏗 Arquitetura do Projeto

### Padrão Arquitetural
- **Framework:** TanStack Start (Meta-framework sobre Vite + React Router)
- **Roteamento:** File-based routing (arquivo `routeTree.gen.ts` é gerado automaticamente)
- **Estado:** Combinação de React Context (Auth) + TanStack Query (async data)
- **Deploy:** Cloudflare Workers (edge computing) + Supabase (backend)

### Fluxo de Dados
```
Usuario → UI (React) → React Query → Supabase Client → Supabase (PostgreSQL)
         ↓ Auth Context (Sessão)
```

### Contexto de Autenticação
- **Provedor:** Supabase Auth (JWT-based)
- **Hook:** `useAuth()` para acesso global à sessão do utilizador
- **Persistência:** Supabase gerencia automaticamente token refresh

---

## ⚙️ Requisitos do Sistema

### Requisitos Locais
- **Node.js:** 18.x LTS ou superior
- **Bun:** 1.0.0 ou superior (recomendado) OU npm/yarn/pnpm
- **Git:** Para controlo de versão
- **RAM:** Mínimo 4GB (6GB recomendado para build)
- **Espaço em disco:** ~500MB para dependências

### Requisitos Remotos
- **Supabase Project:** Criado e configurado
- **Cloudflare Account:** Com KV storage ativo (para edge data)
- **Variáveis de Ambiente:** `.env.local` configurado

### Sistema Operativo Suportado
- Windows 10/11 ✅
- macOS 12+ ✅
- Linux (Ubuntu 20.04+) ✅

---

## 📦 Instalação e Configuração

### Passo 1: Clonar o Repositório
```bash
cd c:\Users\kinam\Desktop\jangoplus
```

### Passo 2: Instalar Dependências
**Opção A: Com Bun (Recomendado)**
```bash
bun install
```

**Opção B: Com npm**
```bash
npm install
```

**Opção C: Com yarn**
```bash
yarn install
```

> **Nota:** O projeto usa `bun.lockb`. Se usar npm/yarn, será criado um `package-lock.json` ou `yarn.lock`.

### Passo 3: Configurar Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://iuqxhcgmywbrpcnflrbc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Cloudflare Configuration (opcional para local)
VITE_CLOUDFLARE_ACCOUNT_ID=your_account_id
VITE_CLOUDFLARE_API_TOKEN=your_api_token
```

> **Como obter as credenciais:**
> 1. Ir a https://supabase.com → Project Settings → API
> 2. Copiar `Project URL` para `VITE_SUPABASE_URL`
> 3. Copiar `anon public` key para `VITE_SUPABASE_ANON_KEY`

### Passo 4: Configurar Supabase Localmente (Opcional)

Se quiser testar com BD local:

```bash
# Instalar CLI do Supabase
npm install -g supabase-cli

# Iniciar Supabase local
supabase start
```

---

## 🚀 Execução do Projeto

### Ambiente de Desenvolvimento

**Com Bun:**
```bash
bun run dev
```

**Com npm:**
```bash
npm run dev
```

A aplicação será disponível em: **http://localhost:5173**

### Build para Produção

**Com Bun:**
```bash
bun run build
```

**Com npm:**
```bash
npm run build
```

Saída: Pasta `dist/` com arquivos otimizados.

### Preview da Build de Produção

```bash
npm run preview
```

Abre http://localhost:4173 com os arquivos de produção.

### Build em Modo Desenvolvimento
```bash
npm run build:dev
```

Útil para debugging de builds.

---

## 📁 Estrutura de Pastas

```
jangoplus/
├── src/
│   ├── routes/                 # Páginas e layouts (file-based routing)
│   │   ├── __root.tsx          # Layout raiz (HTML, Auth Context)
│   │   ├── index.tsx           # Página home
│   │   ├── auth.tsx            # Página autenticação
│   │   ├── missao.tsx          # Missão diária
│   │   ├── evolucao.tsx        # Evolução/progressão
│   │   ├── ranking.tsx         # Ranking competitivo
│   │   ├── treino.tsx          # Sistema de treino
│   │   ├── simulado.*.tsx      # Simulados (exames)
│   │   └── resultado.*.tsx     # Resultados
│   │
│   ├── components/
│   │   ├── ui/                 # Componentes Radix UI (unstyled)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   └── ... (30+ componentes)
│   │   │
│   │   └── sekulo/             # Componentes de negócio customizados
│   │       ├── ApprovalGauge.tsx    # Gauge de aprovação
│   │       ├── XPBar.tsx            # Barra de experiência
│   │       ├── LeagueBadge.tsx      # Badge de liga/divisão
│   │       ├── Stat.tsx             # Componente de estatística
│   │       └── ... (7+ componentes)
│   │
│   ├── lib/                    # Lógica de negócio e hooks
│   │   ├── auth-context.tsx    # Contexto de autenticação
│   │   ├── sekulo-config.ts    # Configuração central (data exame, labels)
│   │   ├── sekulo-brain.ts     # Lógica de IA/algoritmos
│   │   ├── sekulo-voice.ts     # Mensagens e voz da aplicação
│   │   ├── mission.ts          # Lógica de missões
│   │   ├── ranking.ts          # Cálculo de rankings
│   │   ├── progression.ts      # Sistema de progressão
│   │   ├── exams.ts            # Lógica de simulados
│   │   ├── goals.ts            # Sistema de objetivos
│   │   ├── leagues.ts          # Divisões/ligas
│   │   ├── evolution.ts        # Evolução de stats
│   │   ├── approval.ts         # Cálculo de aprovação
│   │   ├── bloom.ts            # Algoritmo Bloom (spaced repetition?)
│   │   ├── topics.ts           # Tópicos por disciplina
│   │   ├── utils.ts            # Funções utilitárias
│   │   └── ...
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── use-mobile.tsx      # Detectar breakpoint mobile
│   │
│   ├── integrations/
│   │   └── supabase/           # Cliente Supabase
│   │       └── client.ts       # Instância do supabase
│   │
│   ├── assets/                 # Imagens, ícones, etc.
│   ├── router.tsx              # Configuração do router
│   ├── routeTree.gen.ts        # GERADO AUTOMATICAMENTE
│   └── styles.css              # Estilos globais
│
├── supabase/
│   ├── config.toml             # Configuração do Supabase
│   └── migrations/             # Migrações SQL do banco
│       ├── 20260420*.sql       # Inicialização de tabelas
│       ├── 20260421*.sql       # Adicionar campos
│       ├── 20260422*.sql       # Índices e constrains
│       ├── 20260504*.sql       # Alterações recentes
│       └── ...
│
├── package.json                # Dependências e scripts
├── tsconfig.json               # Configuração TypeScript
├── vite.config.ts              # Configuração Vite
├── wrangler.jsonc              # Configuração Cloudflare Workers
├── eslint.config.js            # Regras ESLint
├── bunfig.toml                 # Configuração Bun
└── components.json             # Config do UI (shadcn/ui)
```

---

## 🎮 Principais Funcionalidades

### 1. **Autenticação**
- Signup/Login via Supabase
- Google OAuth (se configurado)
- Sessão persistente
- Logout

### 2. **Missão Diária**
- Missão única por dia
- XP progressivo por missão completada
- Impacto em ranking
- Rollover semanal

### 3. **Sistema de Treino**
- Organizações por disciplina (BIO, QUI, FIS, LP, MAT, REV)
- Subtópicos por disciplina
- Simulação de treino com feedback

### 4. **Simulados/Exames**
- Simulados com múltiplas questões
- Cronómetro para timed exams
- Resultados e análise de desempenho
- Histórico de tentativas

### 5. **Ranking**
- Ranking global de utilizadores
- Divisão em ligas por XP
- Vizinhos (top 3 antes/depois)
- Snapshot de ranking por semana

### 6. **Progressão/Evolução**
- XP por missão
- Níveis de aprovação
- Delta badges (progresso relativo)
- Urgency banner (dias até exame)

### 7. **Gamificação**
- XP points
- Badges de conquista
- Ligas competitivas
- Estatísticas personalizadas

---

## 🗄 Base de Dados

### Provedor
- **Supabase** (PostgreSQL gerido)
- **Realtime:** Habilitado para atualizações em tempo real
- **Auth:** JWT com Refresh tokens

### Principais Tabelas (inferidas)
```sql
-- Utilizadores (gerido por Supabase Auth)
auth.users

-- Tabelas de negócio (em supabase/migrations/)
users_stats          -- Estatísticas globais
daily_missions       -- Missões por utilizador/dia
exam_attempts        -- Tentativas de simulados
ranking_snapshots    -- Histórico de ranking
user_leagues         -- Liga/divisão do utilizador
-- ... e outras (ver migrações SQL)
```

### Project ID Supabase
```
iuqxhcgmywbrpcnflrbc
```

---

## 📜 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **dev** | `npm run dev` | Inicia servidor de desenvolvimento (hot reload) |
| **build** | `npm run build` | Build para produção |
| **build:dev** | `npm run build:dev` | Build em modo desenvolvimento (com source maps) |
| **preview** | `npm run preview` | Preview da build de produção |
| **lint** | `npm run lint` | Verifica erros de sintaxe/estilo |
| **format** | `npm run format` | Formata código com Prettier |

### Exemplos de Uso
```bash
# Desenvolver localmente
bun run dev

# Fazer lint antes de push
npm run lint

# Formatar tudo
npm run format

# Preparar para produção
npm run build
npm run preview
```

---

## 🔧 Configurações Importantes

### TypeScript (`tsconfig.json`)
- **Target:** ES2022
- **Module:** ESNext
- **JSX:** react-jsx
- **Strict:** true (tipagem rigorosa)
- **Paths:** `@/*` → `./src/*`

### Vite (`vite.config.ts`)
- Pré-configurado via `@lovable.dev/vite-tanstack-config`
- **Não adicionar manualmente:** tanstackStart, viteReact, tailwindcss, etc.
- Tailwind CSS 4 integrado
- Cloudflare plugin para build

### Tailwind CSS
- **Versão:** 4.2.1 (última)
- **Config:** Integrada via Lovable config
- **Plugins:** tw-animate-css para animações

### ESLint + Prettier
- TypeScript strict
- React Hooks verificados
- Prettier como formatter
- Config em `eslint.config.js`

---

## 🌍 Deployment

### Para Cloudflare Workers (Recomendado)
```bash
# 1. Fazer build
npm run build

# 2. Deploy (requer credenciais Cloudflare)
wrangler deploy
```

### Para Vercel / Netlify
```bash
# O projeto suporta SSR via TanStack Start
# Basta conectar o repo e fazer deploy
```

### Para Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## ✅ Pré-requisitos antes de Executar

Antes de rodar o projeto, certifique-se de:

- [ ] Node.js 18+ instalado (`node --version`)
- [ ] Bun instalado (`bun --version`) - opcional mas recomendado
- [ ] Git instalado
- [ ] Supabase projeto criado
- [ ] `.env.local` configurado com credenciais
- [ ] Acesso internet para instalar dependências

### Quick Checklist
```bash
# Verificar ambiente
node --version          # v18.0.0 ou superior
npm --version           # v9.0.0 ou superior
bun --version          # 1.0.0 ou superior (opcional)

# Verificar Git
git --version

# Testar conectividade
ping supabase.co
```

---

## 🚦 Passos Finais para Testar Localmente

### 1. Preparação Inicial
```bash
cd c:\Users\kinam\Desktop\jangoplus
bun install          # ou npm install
```

### 2. Configuração do Ambiente
```bash
# Criar .env.local
echo VITE_SUPABASE_URL=https://iuqxhcgmywbrpcnflrbc.supabase.co >> .env.local
echo VITE_SUPABASE_ANON_KEY=your_key_here >> .env.local
```

### 3. Iniciar o Servidor
```bash
bun run dev
```

### 4. Abrir no Navegador
```
http://localhost:5173
```

### 5. Testes
- ✅ Tentar fazer login
- ✅ Criar conta nova
- ✅ Navegar pelas rotas
- ✅ Verificar console do navegador (F12) para erros

---

## 🐛 Troubleshooting

### Problema: `VITE_SUPABASE_URL undefined`
**Solução:** Verificar `.env.local` está na raiz e valores começam com `VITE_`
```bash
cat .env.local
```

### Problema: Porta 5173 já em uso
**Solução:**
```bash
# Matar processo na porta 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Ou usar porta diferente
npm run dev -- --port 3000
```

### Problema: Módulos não encontrados
**Solução:**
```bash
# Limpar cache e reinstalar
rm -r node_modules
rm bun.lockb
bun install
```

### Problema: Erro de tipos TypeScript
**Solução:**
```bash
# Gerar tipos do Supabase
bun run generate-types  # se script existir
```

### Problema: `routeTree.gen.ts` desatualizado
**Solução:** Será regenerado automaticamente ao fazer `npm run dev`

### Problema: Compilação falha
**Solução:**
```bash
# Verificar sintaxe
npm run lint

# Formatar código
npm run format

# Fazer rebuild
rm -r dist
npm run build
```

---

## 📚 Recursos Úteis

### Documentação das Tecnologias
- [React 19 Docs](https://react.dev)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack React Query](https://tanstack.com/query/latest)
- [TanStack Start](https://tanstack.com/start/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Vite](https://vitejs.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs/primitives/overview/introduction)

### Cheat Sheets Úteis
- [Zod Validation](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)
- [date-fns Functions](https://date-fns.org/docs/Getting-Started)

---

## 📝 Notas Importantes

### Configuração do Exame
A data do exame é configurada em `src/lib/sekulo-config.ts`:
```typescript
export const EXAM_DATE = new Date("2026-11-30T00:00:00");
```
**Modificar conforme necessário.**

### Disciplinas Suportadas
- BIO - Biologia
- QUI - Química
- FIS - Física
- LP - Língua Portuguesa
- MAT - Matemática
- REV - Revisão

### Ambiente de Produção
- Deploy via Cloudflare Workers
- BD: Supabase gerido
- CDN: Edge computing global

---

## 🎯 Próximos Passos Recomendados

1. **Instalar dependências:** `bun install`
2. **Configurar `.env.local`** com credenciais Supabase
3. **Executar localmente:** `bun run dev`
4. **Testar fluxo de autenticação**
5. **Explorar rotas** e funcionalidades
6. **Verificar console do navegador** para warnings
7. **Fazer lint:** `npm run lint`
8. **Preparar build:** `npm run build`

---

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar este documento
- Consultar documentação das tecnologias
- Verificar logs do console do navegador (F12)
- Verificar terminal de desenvolvimento

---

**Documento gerado automaticamente em 11 de Maio de 2026**  
**Projeto: Jango+ — Sekulo | Versão: 1.0.0**

"# jangoplus" 
