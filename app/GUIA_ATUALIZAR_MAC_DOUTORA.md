# Atualizar o Mac da doutora (versão antiga → 1.0.1) sem perder dados

## Resumo em 30 segundos

1. **Backup** do banco no Mac dela  
2. Instalar o **.dmg da v1.0.1** (mesma identidade do app)  
3. Abrir o app → dados continuam; migrations novas aplicam sozinhas  
4. A partir daí o **auto-update** fica ativo para as próximas versões  

A versão antiga **não** tem auto-update confiável. Por isso a **primeira** atualização é manual (AnyDesk ou você na clínica). Depois, as próximas são automáticas.

---

## Por que os dados NÃO somem

| O que | Onde fica no Mac |
|-------|------------------|
| App (programa) | `/Applications/Controle de Estoque.app` |
| **Banco de dados** | `~/Library/Application Support/com.anamorong.estoque/estoque.db` |

- Identificador do app: **`com.anamorong.estoque`**  
- O instalador novo **substitui só o programa**, não a pasta Application Support.  
- Na abertura, o app roda migrations (024–028 etc.) no banco existente.

---

## Passo a passo seguro (recomendado)

### 0) Espere o Release v1.0.1 ficar pronto

Acompanhe:  
https://github.com/davidwilliamestudo-star/controle-de-estoque-mac/actions  

Quando o job **Release macOS** concluir com sucesso, em **Releases** baixe:

- **Apple Silicon (M1/M2/M3/M4):** pacote `aarch64`  
- **Intel:** pacote `x86_64`  

Como ver o chip: menu Apple → **Sobre este Mac**.

---

### 1) Backup (obrigatório)

**Opção A — pelo app antigo (se abrir)**

1. Abrir o sistema  
2. Menu **Backup** → **Criar Backup Agora**  
3. Salvar em Desktop ou pen drive (arquivo `.db`)

**Opção B — copiar o arquivo na mão (Finder)**

1. Fechar o app completamente  
2. Finder → menu **Ir** → **Ir para a pasta…**  
3. Colar:

```text
~/Library/Application Support/com.anamorong.estoque/
```

4. Copiar `estoque.db` para Desktop / iCloud / pen drive  
5. Nome sugerido: `backup_antes_v1.0.1_AAAA-MM-DD.db`

---

### 2) Instalar a versão nova

1. Fechar o app antigo (Cmd+Q)  
2. Abrir o **.dmg** baixado  
3. Arrastar **Controle de Estoque** para **Aplicativos**  
4. Se pedir substituir: **Substituir** / **Replace**  
5. Ejetar o DMG  

> Não use “desinstalar completo” de ferramentas de limpeza.  
> Só substitua o app em Aplicativos.

---

### 3) Liberar no macOS (se bloquear)

Na **primeira** abertura da build sem assinatura Apple Developer:

1. Clique com o botão direito no app → **Abrir** → **Abrir**  
2. Ou: **Ajustes do Sistema → Privacidade e Segurança → Abrir mesmo assim**

---

### 4) Abrir e validar

1. Login (mesmo usuário de sempre)  
2. Conferir:
   - [ ] Lista de **pacientes**  
   - [ ] **Estoque** / saldos  
   - [ ] **Protocolos**  
   - [ ] **Agenda** ou últimas aplicações  
3. Abrir **Backup → Verificar atualizações**  
   - Pode dizer “já está na versão mais recente” (ok na v1.0.1)  
4. Abrir **Resumo do Mês** e **Financeiro** (módulos novos)

Se algo falhar ao abrir: **não entre em pânico** — restaure o `.db` do backup (passo 7).

---

### 5) Deixar o auto-update configurado (já vem na 1.0.1)

A v1.0.1 já inclui:

- Plugin de atualização  
- Pubkey de assinatura  
- Endpoint: GitHub Releases  
- Modal automático ao abrir (~4 s)  
- Botão: **Backup → Verificar atualizações agora**  

**O que a doutora precisa:**

| Requisito | Detalhe |
|-----------|---------|
| Internet | Só na hora de baixar update |
| Aceitar o aviso | Clicar **Atualizar agora** quando aparecer |
| Não bloquear | Manter o app com o mesmo nome/identifier |

**O que você faz nas próximas versões (de longe):**

```text
1. Sobe código no Windows
2. git tag v1.0.2 && git push origin v1.0.2
3. Actions gera .dmg Mac
4. Avisa a doutora: “abra o sistema com internet e aceite a atualização”
```

---

### 6) AnyDesk (plano B permanente)

Deixe instalado no Mac dela com senha salva (você + alguém de confiança na clínica).  
Se o auto-update falhar, você entra em 10 minutos e instala o `.dmg`.

---

### 7) Se precisar restaurar o backup

1. Fechar o app  
2. Substituir o arquivo:

```text
~/Library/Application Support/com.anamorong.estoque/estoque.db
```

pelo backup  
3. Abrir o app de novo  

Ou usar **Backup → Restaurar** dentro do app (se a UI estiver ok).

---

## O que NÃO fazer

| Evitar | Por quê |
|--------|---------|
| Apagar pasta Application Support | Apaga todos os dados |
| Instalar com **outro** identifier / nome de app | Cria banco “vazio” paralelo |
| Rodar o `.exe` do Windows no Mac | Não funciona |
| “CleanMyMac / desinstalar completo” | Pode apagar dados do app |
| Pular o backup | Sem rede de segurança |

---

## Checklist de instalação (imprimir / WhatsApp)

```
[ ] 1. Chip do Mac anotado (M1/M2/... ou Intel)
[ ] 2. Backup do estoque.db feito e guardado
[ ] 3. App antigo fechado (Cmd+Q)
[ ] 4. DMG v1.0.1 correto instalado em Aplicativos (Substituir)
[ ] 5. App abriu; pacientes e estoque OK
[ ] 6. Backup → Verificar atualizações funciona
[ ] 7. AnyDesk testado (você consegue entrar)
[ ] 8. Doutora sabe: se pedir atualizar, clicar em Atualizar agora
```

---

## Diagrama

```
VERSÃO ANTIGA (Mac)                    VERSÃO 1.0.1 (Mac)
┌──────────────────┐                   ┌──────────────────┐
│ App antigo       │  ──instala──►     │ App novo         │
│ (sem updater)    │     por cima      │ (com updater)    │
└────────┬─────────┘                   └────────┬─────────┘
         │                                      │
         ▼                                      ▼
  estoque.db  ────────────────────────►  mesmo estoque.db
  Application Support                     + migrations novas
  com.anamorong.estoque                   auto-update ligado
```

---

## Em uma frase

**Backup → instale o DMG 1.0.1 por cima do app (não apague dados) → confira pacientes/estoque → a partir daí as atualizações vêm sozinhas pela internet.**
