# 🚀 Deploy no Vercel - Jango+ Sekulo

**Última atualização:** 11 de Maio de 2026  
**Status:** Configurado para Vercel + Node.js

---

## ✅ Alterações Realizadas

O projeto foi reconfigurando para funcionar no **Vercel** ao invés de **Cloudflare Workers**:

### 1. **vite.config.ts**
- ✅ Removido: `@lovable.dev/vite-tanstack-config`
- ✅ Adicionado: Configuração customizada para Node.js SSR
- ✅ Plugin Cloudflare desabilitado
- ✅ TanStack Start configurado para Node.js

### 2. **vercel.json**
- ✅ Criado: Arquivo de configuração do Vercel
- ✅ Define: Comando de build e output
- ✅ Define: Função serverless em `api/handler.ts`
- ✅ Define: Rewrite para rotear todas requisições

### 3. **api/handler.ts**
- ✅ Criado: Handler serverless para Vercel
- ✅ Importa: Servidor SSR compilado do TanStack Start
- ✅ Trata: Erros e requisições HTTP

### 4. **package.json**
- ✅ Adicionado: `@vercel/node` como devDependency

---

## 📋 Passos para Deploy

### Passo 1: Preparação Local

```bash
# 1. Instalar dependências
bun install

# 2. Fazer build localmente (testar)
npm run build

# 3. Verificar build foi bem sucedido
ls dist/
# Deve ter:
# - dist/client/     (frontend)
# - dist/server/     (backend SSR)
```

### Passo 2: Configurar Vercel

**Opção A: Via Interface Web**

1. Ir a https://vercel.com/dashboard
2. Clicar "Add New" → "Project"
3. Selecionar o repositório (GitHub/GitLab/Bitbucket)
4. Vercel vai detectar configuração automaticamente
5. Clicar "Deploy"

**Opção B: Via CLI**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel
```

### Passo 3: Variáveis de Ambiente

No dashboard do Vercel:

1. Ir a **Settings → Environment Variables**
2. Adicionar:

```env
VITE_SUPABASE_URL=https://iuqxhcgmywbrpcnflrbc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
NODE_ENV=production
```

### Passo 4: Deploy

```bash
# Via git push (se conectado com Git)
git add .
git commit -m "Fix: Configure for Vercel deployment"
git push origin main

# Vercel faz deploy automaticamente
```

---

## 🔧 Verificar Build Localmente (Antes de Push)

```bash
# 1. Fazer build
npm run build

# 2. Testar o servidor
npm run preview

# 3. Abrir http://localhost:4173
# Deve carregar normalmente sem erros 404
```

## 📊 Estrutura do Build para Vercel

```
dist/
├── client/                 ← Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── assets/
│   │   ├── *.js
│   │   └── *.css
│   └── manifest.json
│
└── server/                 ← Backend SSR (Node.js)
    ├── index.js           ← Entry point
    ├── assets/
    │   └── *.js
    └── manifest.json

api/
└── handler.ts             ← Função serverless (importa dist/server/index.js)
```

---

## ❌ Problema: "Cannot find /dist/server/index.js"

Se receber erro sobre arquivo não encontrado:

### Solução:

1. **Verificar build:**
   ```bash
   npm run build
   ls -la dist/server/
   # Deve mostrar index.js
   ```

2. **Limpar e reconstruir:**
   ```bash
   rm -rf dist
   rm -rf node_modules
   bun install
   npm run build
   ```

3. **Verificar vite.config.ts:**
   - Certificar que não tem erros
   - SSR target está "node"

---

## ❌ Problema: "First page shows 404"

### Causas possíveis:

1. **Vercel.json incorreto**
   - Verificar: `vercel.json` tem rewrite correto?
   - Solução: Usar o arquivo fornecido

2. **Handler.ts incorreto**
   - Verificar: `api/handler.ts` consegue importar `dist/server/index.js`?
   - Solução: Testar localmente com `npm run preview`

3. **Variáveis de Ambiente**
   - Verificar: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidas?
   - Ir a: Vercel Dashboard → Settings → Environment Variables

---

## 🧪 Testar Deployment

### 1. Build teste local:
```bash
npm run build
npm run preview
```

### 2. Verificar logs do Vercel:
```
Dashboard → Project → Deployments → Logs
```

### 3. Verificar Network tab (F12):
- Status 200 nas requisições
- Sem erros 404

### 4. Verificar Console (F12):
- Sem erros JavaScript
- Supabase conectado

---

## 🌍 Domínio Customizado

1. Ir a **Vercel Dashboard → Project Settings → Domains**
2. Adicionar domínio customizado
3. Atualizar DNS conforme instruções

---

## 📈 Monitoramento pós-Deploy

### Métricas a monitorar:
- ✅ First Contentful Paint (FCP) < 1.8s
- ✅ Largest Contentful Paint (LCP) < 2.5s
- ✅ Time to Interactive (TTI) < 3.8s

### Logs:
```
vercel logs --follow
```

### Revert rápido:
```
Vercel Dashboard → Deployments → Selecionar → Revert
```

---

## 🔄 CI/CD - Auto-deploy

Vercel automaticamente faz deploy quando:
- ✅ Push para `main` branch
- ✅ Pull request criado (preview deployment)
- ✅ Merge de PR

Para desabilitar auto-deploy:
1. **Settings → Git**
2. **Disable Auto-Deploy on Push**

---

## 💾 Backup do Código

Recomendado:

```bash
# Fazer commit local
git add -A
git commit -m "Configure for Vercel"

# Push para repository
git push origin main

# Vercel vai detectar e fazer deploy
```

---

## 🎯 Checklist Pré-Deploy

- [ ] `.env.local` configurado localmente
- [ ] `bun install` executado
- [ ] `npm run build` sucede sem erros
- [ ] `npm run preview` funciona (sem 404)
- [ ] `vercel.json` presente e correto
- [ ] `api/handler.ts` presente
- [ ] `vite.config.ts` customizado
- [ ] GitHub repository atualizado
- [ ] Vercel variáveis de ambiente configuradas
- [ ] Domínio aponta para Vercel (se customizado)

---

## 🆘 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| "dist/server not found" | Executar `npm run build` localmente |
| "First page 404" | Verificar `vercel.json` e `api/handler.ts` |
| "SUPABASE env undefined" | Verificar Environment Variables no Vercel |
| "Module not found" | Limpar `node_modules` e fazer `bun install` |
| "Build falha" | Verificar `npm run lint` localmente |

---

## 📞 Suporte

- 📖 [Vercel Docs](https://vercel.com/docs)
- 📖 [TanStack Start Vercel](https://tanstack.com/start/latest)
- 💬 Vercel Support: https://vercel.com/support

---

## ✨ Próximas Features

Após confirmar deploy funciona:

- [ ] Configurar Custom Domain
- [ ] Setup Analytics (Vercel Analytics)
- [ ] Configurar Monitoramento (Sentry, etc)
- [ ] Auto-scaling (Vercel Serverless Functions)

---

**Deploy pronto! 🚀**

Se tiver dúvidas: Verificar logs do Vercel no dashboard.

