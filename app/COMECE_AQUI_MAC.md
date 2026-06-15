# Comece aqui - Instalacao no Mac

Este pacote serve para instalar e testar o Controle de Estoque em um MacBook.

## Antes de comecar

Tenha em maos:

- acesso remoto pelo AnyDesk ou TeamViewer;
- senha de administrador do Mac;
- internet estavel;
- pelo menos 40 minutos disponiveis;
- este pacote descompactado no Mac.

## 1. Liberar acesso remoto no Mac

No Mac, abra:

```text
Ajustes do Sistema > Privacidade e Seguranca
```

Autorize o AnyDesk ou TeamViewer em:

- Acessibilidade;
- Gravacao de Tela;
- Acesso Total ao Disco, se aparecer.

Se o controle remoto nao responder, feche e abra o AnyDesk/TeamViewer novamente.

## 2. Abrir o Terminal

No Mac:

1. Pressione `Command + Espaco`.
2. Digite `Terminal`.
3. Pressione `Enter`.

## 3. Entrar na pasta do projeto

Se a pasta `app` estiver em Downloads:

```bash
cd ~/Downloads/app
```

Se estiver em outro lugar, arraste a pasta `app` para dentro do Terminal depois de digitar `cd `.

## 4. Checar o Mac

Rode:

```bash
npm run macos:preflight
```

Se disser que falta Node, Rust ou Xcode Command Line Tools, instale o item indicado.

## 5. Instalar Xcode Command Line Tools

Se necessario, rode:

```bash
xcode-select --install
```

Quando aparecer a janela da Apple, clique em instalar e aguarde.

## 6. Instalar Rust

Se necessario, rode:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Quando perguntar a opcao, pressione `Enter`.

Depois feche e abra o Terminal novamente.

## 7. Instalar Node.js

Se necessario, baixe o Node.js LTS:

```text
https://nodejs.org
```

Instale normalmente, feche e abra o Terminal novamente.

## 8. Rodar o app para teste

Dentro da pasta `app`, rode:

```bash
npm install
npm run tauri:dev
```

Se o aplicativo abrir, o app ja esta rodando no Mac.

## 9. Gerar instalador DMG

Dentro da pasta `app`, rode:

```bash
npm run macos:build
```

O instalador deve aparecer em:

```text
src-tauri/target/release/bundle/dmg
```

## 10. Se o Mac bloquear a abertura

Abra:

```text
Ajustes do Sistema > Privacidade e Seguranca
```

Procure o aviso sobre o aplicativo bloqueado e clique em:

```text
Permitir Mesmo Assim
```

Depois tente abrir o app novamente.

## Teste rapido na reuniao

1. Abrir o app.
2. Fazer login.
3. Cadastrar um paciente.
4. Cadastrar um item de estoque.
5. Executar uma aplicacao.
6. Finalizar e conferir baixa de estoque.
7. Copiar evolucao.
8. Gerar relatorio.
9. Exportar backup.
