# Build macOS - Controle de Estoque

Este guia prepara o app para rodar em MacBook como aplicativo desktop local com Tauri 2, React, TypeScript e SQLite.

## Estado atual

- O app ja possui base multiplataforma: Tauri 2, frontend web e banco local via `tauri-plugin-sql`.
- O bundle agora declara os alvos `nsis`, `app` e `dmg`.
- A janela principal continua configurada em `app.windows`; em Tauri esse nome representa janelas da aplicacao, nao o sistema operacional Windows.
- O icone macOS ja existe em `src-tauri/icons/icon.icns`.
- A primeira validacao real do pacote `.app` ou `.dmg` precisa ser feita em um Mac.

## Roteiro rapido para a reuniao

No Windows, deixe a pasta do projeto atualizada e leve uma copia completa da pasta `app` para o Mac da cliente. Nao leve `node_modules` se quiser reduzir o tamanho; ele sera recriado com `npm install`.

No Mac da cliente, abra o Terminal dentro da pasta `app` e rode:

```bash
npm run macos:preflight
npm run macos:build
```

Se o `preflight` apontar falta de Xcode Command Line Tools, Node ou Rust, instale o item indicado e rode o comando novamente.

Se a reuniao tiver pouco tempo, rode primeiro:

```bash
npm install
npm run tauri:dev
```

Esse modo ja prova o app funcional no Mac com SQLite local. Depois, com mais alguns minutos, rode `npm run macos:build` para gerar o `.app` e o `.dmg`.

## Pre-requisitos no Mac

1. Instalar Xcode Command Line Tools:

```bash
xcode-select --install
```

2. Instalar Node.js LTS.

3. Instalar Rust stable:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

4. Validar ferramentas:

```bash
node -v
npm -v
rustc -V
cargo -V
```

## Desenvolvimento no macOS

Execute dentro da pasta `app`:

```bash
npm install
npm run tauri:dev
```

O banco SQLite local continua usando `sqlite:estoque.db`, gerenciado pelo plugin SQL do Tauri.

## Build de producao no macOS

Execute dentro da pasta `app`:

```bash
npm run build
npm run tauri:build:mac
```

Saidas esperadas:

- `.app`: `src-tauri/target/release/bundle/macos`
- `.dmg`: `src-tauri/target/release/bundle/dmg`

Para MacBooks Apple Silicon, o build local do Mac tende a gerar o alvo correto automaticamente. Para binario universal, use o alvo do Tauri em uma maquina macOS:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build:mac -- --target universal-apple-darwin
```

## Build Windows

No Windows, use o script especifico:

```powershell
npm.cmd run tauri:build:windows
```

O script generico `npm run tauri:build` usa os targets do `tauri.conf.json`; em ambientes locais, prefira o script especifico da plataforma.

## Assinatura, notarizacao e Gatekeeper

Para teste interno, o `.app` ou `.dmg` pode ser gerado sem assinatura Apple Developer ID. Nesse caso o macOS pode bloquear a primeira abertura; libere manualmente em Ajustes do Sistema > Privacidade e Seguranca.

Para distribuicao com menos alertas do Gatekeeper, sera necessario:

- conta Apple Developer;
- certificado Developer ID Application;
- assinatura do app;
- notarizacao Apple;
- stapling do ticket de notarizacao.

Os campos `bundle.macOS.signingIdentity` e `bundle.macOS.providerShortName` estao como `null` para nao impedir builds internos. Configure-os apenas no Mac de distribuicao ou via configuracao especifica de release.

## Plugins nativos a validar no Mac

Validar estes fluxos porque dependem de plugins nativos:

- `tauri-plugin-sql`: abrir/criar `estoque.db`, executar migrations e consultas.
- `tauri-plugin-fs`: exportar, copiar e restaurar backup.
- `tauri-plugin-dialog`: escolher arquivo para restauracao/importacao e escolher local para salvar backup.
- `tauri-plugin-clipboard-manager`: copiar evolucao.
- `tauri-plugin-notification`: disparar notificacoes, se usadas no fluxo.
- `tauri-plugin-opener`: abrir arquivos, links e relatorios.

As capabilities atuais sao globais para a janela principal e nao restringem por plataforma. Se backup/restauracao falhar em pastas protegidas do macOS, ajuste o escopo de filesystem depois de reproduzir o erro no Mac.

## Checklist funcional no Mac

1. Abrir o app instalado pelo `.app` ou `.dmg`.
2. Fazer login.
3. Confirmar criacao e abertura do SQLite local.
4. Cadastrar paciente.
5. Cadastrar item de estoque.
6. Executar aplicacao.
7. Finalizar procedimento com baixa de estoque.
8. Copiar evolucao.
9. Gerar e visualizar relatorios.
10. Exportar backup.
11. Restaurar backup.
12. Importar CSV.
13. Testar notificacoes, se usadas.

## Observacoes de compatibilidade

- Primeiro alvo recomendado: macOS Apple Silicon.
- Segundo alvo: build universal ou build separado Intel, se houver MacBooks antigos.
- O app continua offline-first e nao exige migracao para web/SaaS nesta etapa.
- O pacote final de macOS deve ser gerado e validado em macOS, nao no Windows.
