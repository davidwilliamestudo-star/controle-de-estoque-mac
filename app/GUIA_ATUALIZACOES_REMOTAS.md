# Guia: atualizar o app de longe (sem ir ao consultório)

Este sistema é **desktop local** (Tauri). O banco da doutora fica no PC dela.  
A boa notícia: **já existe auto-atualização** (plugin Tauri Updater + modal + botão em Backup).  
Falta **ativar a assinatura** e **publicar releases** corretamente.

> **Você no Windows e a doutora no Mac?**  
> Leia também: [`GUIA_WINDOWS_PARA_MAC.md`](./GUIA_WINDOWS_PARA_MAC.md)  
> Resumo: no Windows você **não** gera `.dmg`; use **GitHub Actions** (Mac na nuvem) ou um Mac real só para o build.

---

## Como funciona (visão simples)

```
Você (de casa / outro estado)
   1. Gera o instalador assinado (build)
   2. Publica no GitHub Releases
   3. Atualiza o arquivo latest.json
        ↓ internet
PC da doutora
   4. Abre o app → verifica atualização (automático em ~4s)
      ou: Backup → "Verificar atualizações agora"
   5. Clica "Atualizar agora"
   6. Baixa, instala e reinicia
   7. Dados (estoque.db) PERMANECEM no PC dela
```

**Importante:** atualizar o **programa** não apaga pacientes, estoque nem financeiro.  
Migrations novas rodam sozinhas na abertura.

---

## O que já está no código

| Peça | Status |
|------|--------|
| `tauri-plugin-updater` | Instalado |
| Endpoint GitHub Releases | Configurado em `tauri.conf.json` |
| Modal de atualização | Ligado no `App.tsx` |
| Botão manual | **Backup → Verificar atualizações agora** |
| Permissões updater/process | Em `capabilities/default.json` |
| Chave pública (`pubkey`) | **AINDA PLACEHOLDER** — precisa gerar |

Endpoint atual:

```text
https://github.com/davidwilliamestudo-star/controle-de-estoque-mac/releases/latest/download/latest.json
```

> Se o repositório for outro (Windows vs Mac), ajuste o endpoint no `tauri.conf.json`.

---

## Passo a passo — configurar UMA vez (você)

### 1) Gerar chaves de assinatura do updater

No PC de desenvolvimento:

```bash
cd app
npx tauri signer generate -w ~/.tauri/anamorong.key
```

Isso cria:

- **chave privada** (`.key`) — **NUNCA** commitar no Git; guarde em local seguro  
- **chave pública** — cole em `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`

Exemplo:

```json
"plugins": {
  "updater": {
    "pubkey": "COLE_AQUI_A_CHAVE_PUBLICA_GERADA",
    "endpoints": [
      "https://github.com/SEU_USUARIO/SEU_REPO/releases/latest/download/latest.json"
    ],
    "windows": {
      "installMode": "passive"
    }
  }
}
```

### 2) Guardar a chave privada para o CI / build

No Windows (PowerShell), ao buildar:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\anamorong.key" -Raw
# se tiver senha na chave:
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "sua-senha"
```

### 3) Subir a versão a cada release

Antes de publicar, aumente a versão em:

- `src-tauri/tauri.conf.json` → `"version": "1.0.1"`  
- opcionalmente `package.json` e `src-tauri/Cargo.toml`

O updater só instala se a versão **nova for maior** que a instalada.

### 4) Gerar o instalador

**Windows (PC da doutora, se for Windows):**

```bash
npm run tauri:build:windows
```

**Mac:**

```bash
npm run tauri:build:mac
```

Arquivos saem em `src-tauri/target/release/bundle/`.

### 5) Publicar no GitHub Releases

1. Crie um **Release** no repositório (ex.: tag `v1.0.1`).  
2. Anexe o instalador (`.exe` NSIS, `.msi`, `.dmg`, etc.).  
3. Anexe também o arquivo de **assinatura** gerado pelo Tauri (`.sig`), se separado.  
4. Publique o **`latest.json`** na raiz do release (ou no caminho do `endpoints`).

Formato típico do `latest.json` (Tauri 2):

```json
{
  "version": "1.0.1",
  "notes": "Correção acerto de estoque + melhorias no financeiro e relatórios.",
  "pub_date": "2026-08-03T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "CONTEUDO_OU_BASE64_DA_ASSINATURA",
      "url": "https://github.com/SEU_USER/SEU_REPO/releases/download/v1.0.1/Controle.de.Estoque_1.0.1_x64-setup.exe"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/SEU_USER/SEU_REPO/releases/download/v1.0.1/Controle.de.Estoque_1.0.1_aarch64.dmg"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/SEU_USER/SEU_REPO/releases/download/v1.0.1/Controle.de.Estoque_1.0.1_x64.dmg"
    }
  }
}
```

> O Tauri CLI costuma gerar o JSON e a assinatura no build. Use o arquivo gerado em `target/release/bundle/` / pasta de updater.

### 6) O que a doutora faz

1. (Opcional) **Backup** → Criar Backup Agora (pendrive).  
2. Abrir o app **com internet**.  
3. Esperar o aviso **ou** ir em **Backup → Verificar atualizações agora**.  
4. Clicar **Atualizar agora**.  
5. App reinicia sozinho na versão nova.

Você **não precisa** ir até o consultório.

---

## Plano B — se o auto-update falhar

| Método | Como |
|--------|------|
| **AnyDesk / TeamViewer** | Você entra remoto, baixa o instalador novo, instala por cima |
| **WhatsApp / e-mail** | Envia o `.exe` / `.dmg`; alguém da clínica instala |
| **Pendrive** | Só se houver visita física |

Instalar **por cima** (mesmo `identifier` `com.anamorong.estoque`) mantém os dados.

---

## Plano C — internet instável no consultório

1. Você gera o instalador.  
2. Envia link de download (Google Drive / GitHub).  
3. Instrua: “feche o sistema → rode o instalador → abra de novo”.  
4. Peça um **print da versão** (ou da tela de Backup após atualizar).

---

## Checklist antes de instalar NA doutora a 1ª vez

- [ ] Build assinado com `pubkey` **real** (não o placeholder)  
- [ ] Endpoint do GitHub correto e **repositório público** (ou token se privado — mais complexo)  
- [ ] Testar no **seu** PC: publicar v1.0.0 → instalar → publicar v1.0.1 → app oferece atualizar  
- [ ] Ensinar a doutora (ou secretária):  
  - Backup semanal  
  - “Se aparecer atualização, clique em Atualizar”  
- [ ] AnyDesk instalado no PC dela (emergência)  

---

## Cuidados com dados

| Situação | O que acontece com o banco |
|----------|----------------------------|
| Auto-update | **Mantém** `estoque.db` |
| Reinstalar por cima | **Mantém** (mesmo product id) |
| Desinstalar “completo” + apagar dados | **Pode apagar** — evitar |
| Restore de backup | Substitui o banco pelo arquivo escolhido |

Sempre: **Backup antes** de grandes atualizações.

---

## Fluxo recomendado para o seu caso (você longe)

```
Hoje (ainda com a doutora ou no 1º setup)
  → Instala versão com updater + chave real configurada
  → Testa “Verificar atualizações”
  → Configura AnyDesk + senha salva com ela
  → Ensina Backup

Depois (você em outro estado)
  → Desenvolve correção
  → Sobe versão (1.0.2)
  → Build + Release no GitHub
  → Avisa: “Abra o sistema com internet e aceite a atualização”
  → Se travar: AnyDesk 10 min
```

---

## O que falta ativar agora (sua lista técnica)

1. **Gerar signer keys** e colar `pubkey` no `tauri.conf.json`  
2. Confirmar **URL do repositório** no `endpoints`  
3. Fazer um **release de teste** (v1.0.0 → v1.0.1) no seu PC  
4. Instalar na doutora **essa** build (já com updater ativo)  
5. Daí em diante: só publicar release  

Sem a chave real, o botão de atualizar **não consegue validar** o instalador (falha de segurança proposital do Tauri).

---

## Resumo em uma frase

**Configure a assinatura + publique releases no GitHub; o app da doutora baixa e instala sozinho. Use AnyDesk só como plano B.**
