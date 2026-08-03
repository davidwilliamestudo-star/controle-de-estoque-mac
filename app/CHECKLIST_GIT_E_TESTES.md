# Checklist: subir pro Git + testar

## Situação atual do seu projeto

| Item | Status |
|------|--------|
| Git inicializado | **Sim** (pasta `Controle de Estoque`) |
| Branch | `main` |
| Remote `origin` | `https://github.com/davidwilliamestudo-star/controle-de-estoque-mac.git` |
| Mudanças locais não commitadas | **Sim** (~100 arquivos: financeiro, resumo do mês, updater, etc.) |
| `node_modules` / `dist` / `target` | Ignorados (não sobem) |

Você **não precisa** criar outro repositório do zero. Só precisa **commitar + dar push** e rodar os testes.

---

## Parte 1 — Git (subir o código)

Abra o **PowerShell** ou terminal na pasta do repositório:

```powershell
cd "C:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque"
```

### 1.1 Ver o que vai subir

```powershell
git status
git remote -v
```

### 1.2 Adicionar arquivos (sem secrets)

```powershell
# Adiciona tudo que o .gitignore permite
git add app/
git add .github/ 2>$null
git add APPS_SCRIPT_INTEGRATION_SPEC.md 2>$null

# Conferir se NÃO entrou: .key, .env, .db, node_modules
git status
```

**Não commite:**

- chaves `*.key` / senhas  
- `.env`  
- bancos `*.db` com dados reais da clínica  

### 1.3 Commit

```powershell
git commit -m "feat: financeiro, resumo do mes, updater e correcoes de estoque

- modulo financeiro e integracao na finalizacao
- resumo mensal de seringas/agulhas/custos
- insumos no protocolo e alertas de setup
- auto-update UI + workflow release macOS
- correcao FK no acerto de estoque (categoria perdas)
- manuais e guias de atualizacao Windows/Mac"
```

### 1.4 Enviar pro GitHub

```powershell
git push origin main
```

Se pedir login: use **GitHub login** ou **Personal Access Token** (não a senha da conta, se 2FA estiver ativo).

### 1.5 Conferir no navegador

Abra:

```text
https://github.com/davidwilliamestudo-star/controle-de-estoque-mac
```

Os arquivos novos devem aparecer (`app/src/features/financial`, `monthly-summary`, `.github/workflows`, etc.).

---

## Parte 2 — Testes locais (no seu Windows)

Ainda na pasta, entre em `app`:

```powershell
cd app
```

### 2.1 Instalar dependências (se precisar)

```powershell
npm ci
```

Se `npm ci` falhar:

```powershell
npm install
```

### 2.2 Testes automatizados (obrigatórios)

```powershell
# 1) Integridade das migrations SQL
npm run verify-migrations

# 2) TypeScript (tipos)
npx tsc --noEmit

# 3) Build do frontend (o mesmo do CI)
npm run build
```

| Comando | O que valida | Esperado |
|---------|----------------|----------|
| `verify-migrations` | 28 migrations + SHA-384 | OK |
| `tsc --noEmit` | tipos TypeScript | 0 erros |
| `npm run build` | migrations + tsc + Vite | exit 0 |

### 2.3 Teste do app desktop (Windows)

```powershell
npm run tauri:dev
```

Checklist rápido na tela:

1. Login: `ana@morong.med.br` / `Ana2026!`  
2. Abrir **Resumo do Mês**  
3. Abrir **Financeiro**  
4. **Protocolos** — bloco Insumos  
5. **Backup → Verificar atualizações** (pode falhar se pubkey ainda for placeholder — normal)  
6. Acerto de estoque diminuindo item **com custo** (não pode dar FK)  

### 2.4 Build instalador Windows (opcional agora)

```powershell
npm run tauri:build:windows
```

Gera o `.exe` em `src-tauri/target/release/bundle/`.

---

## Parte 3 — Teste do pipeline Mac (GitHub Actions)

Isso **não** roda no seu Windows: roda no GitHub (Mac virtual).

### 3.1 Depois do push na `main`

1. Site do repo → aba **Actions**  
2. Confirme se o workflow `Release macOS` aparece  

### 3.2 Gerar um release de teste (quando a chave do updater estiver pronta)

```powershell
# Na pasta do repositório (Controle de Estoque)
git tag v1.0.1
git push origin v1.0.1
```

- Actions builda **macOS**  
- Cria um **Release draft** com `.dmg`  
- Você revisa e publica no GitHub  

**Antes** disso configure os Secrets (repo → Settings → Secrets → Actions):

- `TAURI_SIGNING_PRIVATE_KEY`  
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (se tiver)  

E coloque a **pubkey real** no `app/src-tauri/tauri.conf.json` (hoje ainda é placeholder).

---

## Ordem recomendada (hoje)

```
1. git add + commit + push origin main     ← código no GitHub
2. npm run verify-migrations
3. npx tsc --noEmit
4. npm run build
5. npm run tauri:dev                       ← teste manual 15–20 min
6. (depois) gerar chave updater + secrets
7. (depois) git tag v1.0.x + push           ← build Mac na nuvem
```

---

## Se der erro no push

| Erro | Solução |
|------|---------|
| `rejected (fetch first)` | `git pull --rebase origin main` depois `git push` |
| `Authentication failed` | Criar token em GitHub → Settings → Developer settings → PAT |
| Arquivo grande demais | Não suba `.mp4` / `node_modules` / `target` (já no ignore) |

---

## Se der erro nos testes

| Erro | Solução |
|------|---------|
| Migration SHA | Não edite SQL antigos; rode `node scripts/verify-migrations.mjs` |
| `tsc` com erro | Leia a linha do arquivo e corrija o tipo |
| `tauri:dev` não abre | Rust instalado? `rustc -V` · WebView2 no Windows |
| Build Mac no Actions falha | Veja o log do job; confira `npm ci` e secrets |

---

## Resumo em 4 comandos

```powershell
cd "C:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque"

git add app/
git commit -m "feat: financeiro, resumo do mes, updater e correcoes"
git push origin main

cd app
npm run verify-migrations; npx tsc --noEmit; npm run build
npm run tauri:dev
```

Se quiser que eu **faça o commit e o push por aqui**, diga explicitamente:  
**“pode commitar e dar push”** (e confirme se o remote `controle-de-estoque-mac` é o correto).
