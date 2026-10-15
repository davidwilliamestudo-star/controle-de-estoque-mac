# Guia Passo a Passo: Publicar o Sistema em app.draanamorong.com.br com Login e Senha

Este guia ensina, de forma prática e detalhada, como colocar o sistema da Clínica Dra. Ana Morong online no subdomínio oficial **`https://app.draanamorong.com.br`**, com banco de dados em nuvem (**Cloudflare D1**) e tela de login protegida.

---

## 📋 Sumário
1. [Dica Importante: Navegação no PowerShell (Pastas com Espaços)](#1-dica-importante-navegação-no-powershell)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Passo 1: Entrar na pasta do projeto](#passo-1-entrar-na-pasta-do-projeto)
4. [Passo 2: Fazer login na Cloudflare (Wrangler)](#passo-2-fazer-login-na-cloudflare)
5. [Passo 3: Criar o Banco de Dados Cloudflare D1](#passo-3-criar-o-banco-de-dados-cloudflare-d1)
6. [Passo 4: Atualizar o arquivo wrangler.toml](#passo-4-atualizar-o-arquivo-wranglertoml)
7. [Passo 5: Subir as Tabelas e o Usuário Inicial no Banco](#passo-5-subir-as-tabelas-e-o-usuário-inicial-no-banco)
8. [Passo 6: Fazer o Build e Publicar no Cloudflare Pages](#passo-6-fazer-o-build-e-publicar-no-cloudflare-pages)
9. [Passo 7: Conectar o Banco D1 ao Cloudflare Pages no Painel](#passo-7-conectar-o-banco-d1-ao-cloudflare-pages-no-painel)
10. [Passo 8: Configurar o Subdomínio app.draanamorong.com.br e SSL](#passo-8-configurar-o-subdomínio-appdraanamorongcombr)
11. [Passo 9: Primeiro Acesso e Credenciais de Login](#passo-9-primeiro-acesso-e-credenciais-de-login)
12. [Resolução de Problemas Comuns (FAQ)](#resolução-de-problemas-comuns)

---

## 1. Dica Importante: Navegação no PowerShell

No Windows PowerShell, qualquer pasta ou comando que contenha **espaços** no nome precisa obrigatoriamente estar entre **aspas duplas** `" "`.

❌ **Errado (gera erro de parâmetro posicional):**
```powershell
cd Controle de Estoque
cd C:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\app
```

✔️ **Correto (com aspas):**
```powershell
cd "Controle de Estoque\app"
# ou com caminho completo:
cd "C:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\app"
```

---

## 2. Pré-requisitos

1. **Conta na Cloudflare:** Gratuita em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
2. **Node.js 18+** instalado no seu computador.
3. Acesso administrativo ao provedor onde o domínio `draanamorong.com.br` está registrado (ex: Registro.br, Cloudflare DNS, Hostgator, etc.).

---

## Passo 1: Entrar na pasta do projeto

Abra o terminal (PowerShell ou VS Code) e navegue até a pasta `app` utilizando aspas:

```powershell
cd "C:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\Controle de Estoque\app"
```

Confirme que está na pasta certa rodando:
```powershell
ls package.json
```
*(Se listar o arquivo `package.json`, você está no local correto).*

---

## Passo 2: Fazer login na Cloudflare

No mesmo terminal, rode o comando:

```powershell
npx wrangler login
```

1. Uma aba do navegador será aberta automaticamente pedindo para autorizar o Cloudflare CLI.
2. Clique em **Allow** (Permitir).
3. Volte ao terminal. Aparecerá a mensagem: `Successfully logged in`.

---

## Passo 3: Criar o Banco de Dados Cloudflare D1

Crie a base de dados SQLite na nuvem Cloudflare com o comando:

```powershell
npx wrangler d1 create dra-ana-estoque-db
```

O terminal exibirá uma resposta parecida com esta:
```toml
[[d1_databases]]
binding = "DB"
database_name = "dra-ana-estoque-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

> 📌 **Copie o código gerado em `database_id`** (algo no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

---

## Passo 4: Atualizar o arquivo wrangler.toml

Abra o arquivo `wrangler.toml` localizado dentro da pasta `app/` no seu editor:

Substitua a linha:
```toml
database_id = "LOCAL_OR_CLOUDFLARE_D1_DATABASE_ID"
```

Pelo seu `database_id` real copiado no passo anterior, por exemplo:
```toml
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Salve o arquivo (`Ctrl + S`).

---

## Passo 5: Subir as Tabelas e o Usuário Inicial no Banco

Agora você vai enviar a estrutura das tabelas (pacientes, produtos, estoque, finanças, usuários) e o usuário de login para a nuvem da Cloudflare:

```powershell
# 1. Cria todas as tabelas no D1 remoto
npx wrangler d1 execute dra-ana-estoque-db --remote --file=./scripts/d1-schema.sql

# 2. Insere os dados iniciais e o usuário de acesso
npx wrangler d1 execute dra-ana-estoque-db --remote --file=./scripts/d1-seed-data.sql
```

> 💡 **Quer usar os dados reais do banco do computador da doutora?**  
> Se houver um arquivo `estoque.db` local com pacientes e estoque reais já cadastrados, execute antes:
> ```powershell
> python scripts/export_d1_data.py
> ```
> Isso atualizará o arquivo `d1-seed-data.sql` com todos os dados reais da clínica antes de você enviar para a nuvem.

---

## Passo 6: Fazer o Build e Publicar no Cloudflare Pages

Execute o script de build e publicação que já está pronto no projeto:

```powershell
npm run deploy:pages
```

Esse comando irá:
1. Validar as migrations.
2. Compilar o TypeScript e o Vite (`dist`).
3. Fazer upload do frontend e das APIs (`functions/api/[[route]].ts`) para a Cloudflare.

Ao final, o terminal fornecerá um link temporário, por exemplo:
`https://dra-ana-estoque.pages.dev`

---

## Passo 7: Conectar o Banco D1 ao Cloudflare Pages no Painel

Para que o site consiga consultar o banco na nuvem e validar o login:

1. Acesse o painel da Cloudflare: [dash.cloudflare.com](https://dash.cloudflare.com)
2. No menu lateral esquerdo, clique em **Compute (Workers & Pages)**.
3. Clique no projeto **dra-ana-estoque**.
4. Clique na aba superior **Settings** (Configurações) > **Functions** (Funções).
5. Role até a seção **D1 database bindings** e clique em **Add binding**:
   - **Variable name:** `DB` *(exatamente essas 2 letras maiúsculas)*
   - **D1 database:** Selecione `dra-ana-estoque-db`
6. Clique em **Save** (Salvar).
7. *(Opcional e Recomendado)* Na mesma tela em **Settings** > **Environment variables**, adicione uma variável:
   - **Variable name:** `JWT_SECRET`
   - **Value:** Crie uma frase secreta segura (ex: `DraAnaClinicSecureKey2026!#`)
8. Faça um novo deploy rápido ou no terminal execute `npm run deploy:pages` para aplicar o vínculo.

---

## Passo 8: Configurar o Subdomínio app.draanamorong.com.br

### Parte A: No painel da Cloudflare Pages
1. Ainda dentro do projeto **dra-ana-estoque** no painel da Cloudflare, clique na aba **Custom domains** (Domínios personalizados).
2. Clique no botão **Set up a custom domain** (Configurar domínio personalizado).
3. Digite o subdomínio completo:
   ```text
   app.draanamorong.com.br
   ```
4. Clique em **Continue**.

---

### Parte B: No Provedor de DNS do seu Domínio

Dependendo de onde o domínio `draanamorong.com.br` está hospedado:

#### Cenário 1: Se o domínio já utiliza os servidores DNS da Cloudflare
* A própria Cloudflare detectará a zona e criará o registro CNAME automaticamente com 1 clique!
* O certificado SSL é gerado de imediato.

#### Cenário 2: Se o DNS estiver no Registro.br, Hostinger, cPanel, etc.
1. Acesse o painel de gerenciamento de DNS do seu provedor.
2. Adicione um novo registro DNS:
   * **Tipo:** `CNAME`
   * **Nome / Host:** `app`
   * **Destino / Valor / Aponta para:** `dra-ana-estoque.pages.dev` *(ou o endereço indicado pela Cloudflare na tela anterior)*
   * **TTL:** `Automático` (ou `3600`)
3. Salve a alteração.
4. Aguarde a validação (geralmente leva de 5 a 30 minutos). A Cloudflare emitirá o certificado SSL (HTTPS com cadeado verde) de forma 100% gratuita e automática.

---

## Passo 9: Primeiro Acesso e Credenciais de Login

Assim que o DNS propagar, acesse pelo navegador:
👉 **`https://app.draanamorong.com.br`**

A tela de autenticação será exibida:

* **E-mail inicial:** `ana@morong.med.br`
* **Senha inicial:** `Ana2026!`

### Ações Recomendadas após o Primeiro Acesso:
1. **Alterar a senha:** Vá em Configurações / Perfil e defina uma senha pessoal forte.
2. **Cadastrar novos usuários:** Caso recepcionistas ou outros profissionais precisem de acesso, crie os logins adicionais no módulo de Usuários.
3. **Favoritar no navegador:** Adicione o endereço `https://app.draanamorong.com.br` aos favoritos do computador da clínica, celular ou tablet da doutora.

---

## Resolução de Problemas Comuns

| Sintoma | Causa Mais Provável | Solução |
| :--- | :--- | :--- |
| `Set-Location : Não é possível localizar um parâmetro posicional...` | Executou `cd` em pasta com espaço sem aspas. | Coloque o caminho entre aspas duplas: `cd "Controle de Estoque\app"`. |
| `E-mail ou senha inválidos` na tela de login web | O script `d1-seed-data.sql` não foi executado no D1 remoto. | Rode `npx wrangler d1 execute dra-ana-estoque-db --remote --file=./scripts/d1-seed-data.sql`. |
| Erro `DB binding not found` ao consultar dados | O binding `DB` não foi configurado nas configurações de Functions do Pages. | Acesse **Settings > Functions > D1 database bindings**, adicione `DB` apontando para `dra-ana-estoque-db` e salve. |
| Subdomínio não abre ou dá "Não seguro" | DNS ainda propagando ou registro CNAME incorreto. | Verifique se no Registro.br o CNAME foi criado com nome `app` apontando para `dra-ana-estoque.pages.dev`. Aguarde até 1 hora para a emissão do certificado SSL. |
