# Você no Windows · Doutora no Mac — como funciona

## A regra de ouro

| Onde você está | O que consegue gerar |
|----------------|----------------------|
| **Windows** | Instalador **Windows** (`.exe`) |
| **Mac** (ou máquina Mac na nuvem) | Instalador **Mac** (`.app` / `.dmg`) |

**Não existe** “buildar .dmg do Mac a partir do Windows” de forma nativa e confiável.  
O código (React/TS/SQL) você desenvolve no Windows à vontade.  
O **pacote final para a MacBook dela** precisa ser gerado em ambiente macOS.

---

## Solução recomendada (você longe, sem Mac físico)

### GitHub Actions = Mac na nuvem

```
Seu Windows
  1. Programa e corrige o app
  2. git push + cria tag v1.0.2
        ↓
GitHub (máquina virtual Mac)
  3. Compila o .dmg do macOS
  4. Publica no Release
        ↓
Mac da doutora
  5. Auto-update OU baixa o .dmg / AnyDesk
```

O workflow já está em:

```text
.github/workflows/release-macos.yml
```

### Como usar no dia a dia

1. No Windows, finalize as mudanças e suba pro GitHub.  
2. Crie uma tag de versão:

```bash
git add .
git commit -m "fix: correcao acerto estoque e updates"
git tag v1.0.2
git push origin main
git push origin v1.0.2
```

3. Abra o GitHub → **Actions** → espere o job **Release macOS** terminar.  
4. Em **Releases**, confira o rascunho (`draft`) com os `.dmg`.  
5. Publique o release.  
6. A doutora (com internet):
   - abre o app → “Nova atualização”, **ou**
   - **Backup → Verificar atualizações**, **ou**
   - você instala por AnyDesk o `.dmg` novo.

---

## Fluxo completo (Windows dev → Mac da clínica)

### A) Desenvolvimento (sempre no seu Windows)

```bash
npm run tauri:dev          # testar lógica no Windows
npm run build              # validar frontend
npm run verify-migrations  # migrations OK
```

Você **não** precisa do Mac dela para programar.

### B) Gerar versão Mac (nuvem)

1. Secrets no repositório GitHub:
   - `TAURI_SIGNING_PRIVATE_KEY`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (se tiver)
2. Tag `vX.Y.Z` + push  
3. Actions gera artefatos Mac  

### C) Gerar versão Windows (no seu PC, se precisar)

```bash
npm run tauri:build:windows
```

Só se alguém for usar Windows. A doutora é Mac → o que importa é o job da Actions.

---

## Chip do Mac dela (importante)

| Mac | Arquivo |
|-----|---------|
| **M1 / M2 / M3 / M4** (maioria hoje) | `aarch64` (Apple Silicon) |
| **Intel** (2019 e antes, em geral) | `x86_64` |

Como descobrir no Mac dela:

```text
Menu Apple → Sobre este Mac → Chip / Processador
```

- “Apple M1/M2/…” → **aarch64**  
- “Intel” → **x86_64**

O workflow gera **os dois** por padrão.

---

## Auto-update Mac vs Windows

O updater do Tauri lê o `latest.json` e baixa o binário da **plataforma do PC**:

```json
"platforms": {
  "darwin-aarch64": { "url": "...dmg ou .app.tar.gz", "signature": "..." },
  "darwin-x86_64":  { "url": "...", "signature": "..." },
  "windows-x86_64": { "url": "...exe", "signature": "..." }
}
```

No Mac dela só importa a entrada `darwin-*`.  
Você no Windows pode até nem publicar Windows, se só a doutora usa.

**Endpoint atual** (confira se o repo é esse):

```text
https://github.com/davidwilliamestudo-star/controle-de-estoque-mac/releases/latest/download/latest.json
```

---

## Bloqueio do macOS (“app de desenvolvedor não identificado”)

Sem conta **Apple Developer** paga (~US$ 99/ano), o Mac pode avisar na 1ª abertura.

**Na clínica (uma vez por versão / se bloquear):**

1. Clique com o botão direito no app → **Abrir** → **Abrir**  
2. Ou: **Ajustes → Privacidade e Segurança** → “Abrir mesmo assim”

Isso **não** impede o uso. Só pede liberação manual na primeira vez.

Com Apple Developer + notarização, some o aviso (opcional, mais trabalho).

---

## Plano se a Actions falhar

| Plano | O que fazer |
|-------|-------------|
| **B – AnyDesk no Mac dela** | Você entra remoto, faz `git pull` + `npm run macos:build` **no Mac dela** (lento, mas funciona) |
| **C – Emprestar / alugar Mac** | MacStadium, MacinCloud, ou Mac de um amigo 1x por release |
| **D – Enviar .dmg** | Você gera na nuvem, manda link; alguém instala na clínica |

**Nunca** envie o `.exe` do Windows para o Mac dela — não roda.

---

## O que instalar na 1ª visita / 1º setup no Mac dela

1. App gerado para **macOS** (não o instalador Windows).  
2. AnyDesk (emergência).  
3. Ensinar: Backup + “se pedir atualizar, aceitar”.  
4. Liberar o app em Privacidade e Segurança se o macOS bloquear.  
5. Confirmar internet (só precisa na hora de atualizar).

Depois você só:

```text
programar no Windows → tag → Actions → release → avisar
```

---

## Resumo visual

```
┌─────────────────────┐         ┌──────────────────────┐
│  SEU PC (Windows)   │         │  GITHUB ACTIONS      │
│  - código           │  push   │  (Mac virtual)       │
│  - testes           │ ──────► │  - build .dmg        │
│  - tag v1.0.x       │  tag    │  - release           │
└─────────────────────┘         └──────────┬───────────┘
                                           │ download
                                           ▼
                                ┌──────────────────────┐
                                │  MAC DA DOUTORA      │
                                │  - usa o app         │
                                │  - auto-update       │
                                │  - dados locais OK   │
                                └──────────────────────┘
```

---

## Checklist rápido

- [ ] Repo no GitHub com o código  
- [ ] Workflow `release-macos.yml` no repo  
- [ ] Secrets da chave Tauri configurados  
- [ ] `pubkey` real no `tauri.conf.json` (não o placeholder)  
- [ ] Endpoint do release apontando pro repo certo  
- [ ] Saber se o Mac dela é **M-series** ou **Intel**  
- [ ] AnyDesk como plano B  
- [ ] Primeira instalação já com build **Mac**  

---

## Em uma frase

**Você programa no Windows; um Mac da nuvem (GitHub Actions) gera o instalador dela; o Mac da doutora atualiza sozinho ou por AnyDesk.**
