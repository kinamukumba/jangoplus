# 🚀 Setup Rápido - Jango+ Sekulo

**Tempo estimado:** 10-15 minutos

---

## ⚡ Quick Start (5 minutos)

### 1️⃣ Instalar dependências
```bash
bun install
```
> Se não tem Bun: `npm install`

### 2️⃣ Configurar variáveis de ambiente
Criar arquivo `.env.local` na raiz:
```env
VITE_SUPABASE_URL=https://iuqxhcgmywbrpcnflrbc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3️⃣ Iniciar servidor
```bash
bun run dev
```

### 4️⃣ Abrir no navegador
```
http://localhost:5173
```

---

## 🔐 Obter Credenciais Supabase

### Supabase Project ID (já temos):
```
iuqxhcgmywbrpcnflrbc
```

### Para obter a ANON KEY:
1. Ir a: https://supabase.com/dashboard
2. Selecionar o projeto "tanstack-start-app"
3. Ir a **Settings → API**
4. Copiar o valor de **Project URL** → `VITE_SUPABASE_URL`
5. Copiar o valor de **anon public** → `VITE_SUPABASE_ANON_KEY`

---

## 📋 Checklist Pré-Executar

```bash
# 1. Verificar versões
node --version        # Deve ser v18+
npm --version         # Deve ser v9+
bun --version        # Deve ser 1.0+

# 2. Verificar arquivo .env.local existe
test -f .env.local && echo "✅ .env.local existe" || echo "❌ .env.local falta"

# 3. Verificar node_modules
test -d node_modules && echo "✅ Dependências instaladas" || echo "❌ Falta bun install"

# 4. Limpar cache (se necessário)
bun pm cache rm  # ou npm cache clean --force

# 5. Reinstalar se houver erro
rm -rf node_modules
rm bun.lockb  # ou package-lock.json
bun install
```

---

## 🎯 Comandos Essenciais

| Comando | O que faz |
|---------|-----------|
| `bun run dev` | 🟢 Inicia servidor (hot reload) |
| `npm run build` | 📦 Cria build de produção |
| `npm run lint` | ✅ Verifica erros |
| `npm run format` | 🎨 Formata código |
| `npm run preview` | 👀 Vê build de produção |

---

## 🐛 Erro Comum?

### "Cannot find module"
```bash
bun install
```

### "Port 5173 already in use"
```bash
# Matar processo
npx kill-port 5173
bun run dev
```

### ".env.local variables undefined"
```bash
# Verificar arquivo
cat .env.local

# Deve ter VITE_ no início
# ✅ VITE_SUPABASE_URL=...
# ❌ SUPABASE_URL=...  (sem VITE_)
```

---

## ✨ Próxima Etapa

Depois de `bun run dev` funcionar:

1. **Testar Login** - Criar conta no Auth
2. **Ir a `/` (Home)** - Ver dashboard
3. **Explorar `/missao`** - Missão diária
4. **Ver `/ranking`** - Ranking global
5. **Verificar Console (F12)** - Sem erros?

---

## 📚 Documentação Completa

Para detalhes técnicos completos: **`DOCUMENTACAO_TECNICA.md`**

---

**Pronto? Então vá! `bun run dev` 🚀**

