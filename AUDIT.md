# AUDIT - Controle de Estoque Dra. Ana Morong

Data da auditoria: 2026-06-10  
Escopo: leitura e análise técnica, funcional, visual e arquitetural do projeto atual, comparando com `README-controle-de-estoque-dra-ana.md`, `design-prototype/` e stack definida.  
Restrição aplicada: nenhum arquivo funcional foi alterado; apenas este `AUDIT.md` foi criado.

## 1. Resumo executivo

O projeto está em estágio inicial/intermediário de fundação. A estrutura principal esperada existe: `design-prototype/` foi preservado, o app real está em `app/`, há Tauri 2 + React + TypeScript + SQLite via plugin SQL, e existem migrations com boa parte do modelo de dados descrito no README.

O ponto mais forte do projeto é o banco inicial: a migration `001_initial.sql` contempla usuários, pacientes, categorias, vias, áreas corporais, fornecedores, itens de estoque, lotes, movimentações, templates de evolução, protocolos, agenda, procedimentos, itens usados, auditoria e settings. Isso alinha bem com a visão local-first, offline e preparada para futuro SaaS.

O ponto mais frágil é a implementação funcional. Hoje, o único módulo com CRUD real é Pacientes, com service, repository, schema, hook e modal. Dashboard, estoque, protocolos, relatórios, auditoria e configurações ainda são placeholders. Agenda, aplicações, medicamentos, materiais e backup aparecem no menu, mas não possuem rotas registradas. O fluxo crítico do produto - aplicação com seleção de lote, validação de estoque, transação SQLite, baixa automática, evolução e auditoria - ainda não existe.

Também há problemas técnicos que impedem considerar a fundação pronta: `npm.cmd exec tsc -- --noEmit` falha com erros de tipagem em formulário, rotas TanStack, navegação para rota inexistente e tipo de retorno do SQLite. Além disso, a capability Tauri declara apenas `core:default` e `opener:default`, enquanto o app usa plugins SQL, FS, dialog, clipboard, store e notification, o que tende a bloquear funcionalidades quando chamadas pelo frontend.

## 2. Status geral do projeto

Status global: Parcial, com fundação de banco avançada e UI funcional limitada.

Resumo por área:

| Área | Status | Observação |
|---|---:|---|
| Estrutura Tauri/React | Parcial | Estrutura existe, mas há arquivos de template Vite/Tauri ainda sobrando em `app/src/App.tsx`, `app/src/App.css`, `app/src/assets/react.svg`, `app/public/vite.svg` e `app/public/tauri.svg`. |
| README e escopo | Parcial | Banco segue grande parte do README; funcionalidades ainda não acompanham. |
| Protótipo visual | Preservado | `design-prototype/` existe com `index.html`, `style.css` e `app.js`. |
| Banco SQLite | Parcial forte | Migrations existem e cobrem muitas tabelas, mas faltam etiquetas/backup estruturado e algumas FKs/checks. |
| Services/repositories | Parcial | Existem para pacientes e auditoria básica; faltam praticamente todos os demais domínios. |
| UI real | Parcial | Layout, sidebar, splash, login visual e pacientes existem; demais módulos são placeholders. |
| Segurança/LGPD | Inicial | Login é visual, seed tem hash placeholder, não há sessão, bloqueio real, hash de senha real ou backup seguro. |
| Build/typecheck | Falhando | `tsc --noEmit` falha. Build completo não foi rodado para não gerar artefatos. |

## 3. Stack detectada

Stack declarada/instalada:

| Item | Detectado |
|---|---|
| Desktop | Tauri 2.11.2 no Rust / `@tauri-apps/api` 2.11.0 |
| Frontend | React 19.2.7 + React DOM 19.2.7 |
| Linguagem | TypeScript 5.8.3 |
| Build/dev | Vite 7.3.5 |
| Estilo | Tailwind CSS 4.3.0 + `@tailwindcss/vite` 4.3.0 |
| Roteamento | `@tanstack/react-router` 1.170.15 |
| Server state | `@tanstack/react-query` 5.101.0 |
| Tabelas | `@tanstack/react-table` 8.21.3 |
| Formulários | React Hook Form 7.78.0 |
| Validação | Zod 4.4.3 |
| Datas | date-fns 4.4.0 |
| Ícones | lucide-react 1.17.0 |
| PDF | pdf-lib 1.17.1 instalado, mas README recomenda HTML + CSS print |
| SQLite | `@tauri-apps/plugin-sql` 2.4.0 + Rust plugin com feature `sqlite` |
| Tauri plugins | opener, sql, fs, dialog, clipboard-manager, store, notification |

Avaliação:

- A stack está alinhada ao objetivo de app local, leve, offline e sem mensalidade.
- O uso de TanStack Query/Table faz sentido para CRUD local com cache e listas.
- `pdf-lib` pode ser útil, mas para o MVP descrito talvez seja desnecessário se a estratégia real for HTML + CSS print.
- Plugins de FS/dialog/clipboard/notification fazem sentido para backup, exportação, cópia de evolução e alertas, mas ainda não estão usados de forma completa.
- A capability Tauri ainda não está alinhada aos plugins instalados.

Dependências possivelmente ausentes para os requisitos:

- Gerador de QR Code e código de barras para etiquetas.
- Hash de senha real no lado seguro, por exemplo via Rust/Argon2 ou bcrypt.
- Compactação/criptografia de backup, se essa decisão for implementada no app.
- Camada utilitária para print/PDF, caso permaneça HTML + CSS print.

Dependências possivelmente desnecessárias neste momento:

- `pdf-lib`, enquanto os relatórios ainda não existem e o README recomenda print.
- `@tauri-apps/plugin-store`, se settings forem mantidas no SQLite.
- `@tauri-apps/plugin-notification`, se alertas ficarem apenas dentro da UI no MVP.

## 4. Estrutura de arquivos

Estrutura principal detectada:

```txt
Controle de Estoque/
  README-controle-de-estoque-dra-ana.md
  AUDIT.md
  design-prototype/
    index.html
    style.css
    app.js
  img/
  app/
    package.json
    package-lock.json
    vite.config.ts
    tsconfig.json
    src/
    src-tauri/
    node_modules/
```

Pontos positivos:

- `design-prototype/` está preservado.
- `app/` concentra o app real Tauri + React + TypeScript.
- `app/src/app`, `app/src/components`, `app/src/features`, `app/src/lib` e `app/src/styles` seguem a arquitetura recomendada.
- `app/src/lib/db/migrations` existe e é usado pelo Rust via `include_str!`.

Problemas de estrutura:

| Severidade | Problema | Onde ocorre | Impacto | Recomendação |
|---|---|---|---|---|
| Médio | Arquivos de template Tauri/Vite permanecem no app | `app/src/App.tsx`, `app/src/App.css`, `app/src/assets/react.svg`, `app/public/vite.svg`, `app/public/tauri.svg`, `app/README.md` | Confunde manutenção e pode indicar código morto. | Remover em etapa própria, depois de verificar imports. |
| Médio | `node_modules/` e `app/src-tauri/target/` estão dentro do workspace auditado | `app/node_modules`, `app/src-tauri/target` | Torna buscas lentas e polui auditorias. | Manter fora de versionamento; conferir `.gitignore` quando houver repo. |
| Alto | Rotas do menu não existem no router | Sidebar aponta para `/agenda`, `/procedures`, `/medications`, `/materials`, `/backup` | Cliques levam a rotas inexistentes e erros de navegação. | Criar rotas placeholder ou remover links até implementar. |
| Médio | Módulos previstos no README ainda não têm pastas | `procedures`, `appointments`, `backup`, `materials`, `medications`, `labels` ausentes | Dificulta evolução organizada. | Criar módulos quando iniciar cada fase, com pages/services/repositories/schemas. |

## 5. Comparação com README

O README descreve um sistema clínico operacional completo. A implementação atual cobre principalmente a fundação e uma parte de Pacientes.

Alinhado ao README:

- Stack Tauri + React + TypeScript + SQLite.
- Tailwind, React Hook Form, Zod, date-fns e Lucide.
- Estrutura por features.
- SQLite local com migrations.
- Uso de `clinic_id`.
- Tabelas centrais do modelo recomendado.
- Layout com sidebar minimizável.
- Protótipo preservado.
- Pacientes com CRUD básico real.
- Prontuário de paciente com abas e leitura de procedimentos.
- Auditoria básica para criação/edição/inativação de paciente.

Ainda não alinhado:

- Login local real.
- Hash de senha real.
- Controle de sessão.
- Dashboard com dados reais.
- Estoque funcional.
- Medicamentos, materiais, lotes e fornecedores funcionais.
- Protocolos funcionais.
- Fluxo de aplicação/atendimento.
- Boneco SVG clicável.
- Seleção de área por via.
- Seleção de lote.
- Baixa automática de estoque.
- Transação SQLite de finalização.
- Evolução por template.
- Botão copiar evolução com auditoria.
- Relatórios reais e PDF.
- Backup e restauração.
- Agenda local e sincronização opcional Google Calendar.
- Auditoria completa.
- Etiquetas, QR Code e código de barras.

## 6. Banco de dados

Migrations detectadas:

- `app/src/lib/db/migrations/001_initial.sql`
- `app/src/lib/db/migrations/002_seed_dev.sql`

Execução:

- `app/src-tauri/src/lib.rs` registra as duas migrations no `tauri_plugin_sql::Builder`.
- Banco configurado como `sqlite:estoque.db`.
- `PRAGMA journal_mode=WAL` e `PRAGMA foreign_keys=ON` estão no SQL da migration.

Tabelas existentes:

| Tabela | Status em relação ao README |
|---|---|
| `users` | Existe. |
| `patients` | Existe. |
| `inventory_categories` | Existe. |
| `administration_routes` | Existe. |
| `body_areas` | Existe. |
| `route_body_areas` | Existe. |
| `suppliers` | Existe. |
| `inventory_items` | Existe. |
| `inventory_batches` | Existe. |
| `stock_movements` | Existe. |
| `evolution_templates` | Existe. |
| `protocols` | Existe. |
| `protocol_items` | Existe. |
| `appointments` | Existe. |
| `procedures` | Existe. |
| `procedure_items_used` | Existe. |
| `audit_logs` | Existe. |
| `settings` | Existe. |

Campos estruturais:

- `id`: presente nas tabelas principais.
- `clinic_id`: presente nas tabelas principais.
- `created_at`: presente nas tabelas principais.
- `updated_at`: presente na maioria das tabelas, mas não em `stock_movements`, `procedure_items_used`, `route_body_areas` e `audit_logs`, o que é aceitável para tabelas append-only, mas deve ser decisão explícita.
- `deleted_at`: presente nas principais entidades mutáveis; ausente em `body_areas`, `route_body_areas`, `stock_movements`, `procedure_items_used` e `audit_logs`.

Riscos e lacunas do banco:

| Severidade | Problema | Impacto | Onde ocorre | Recomendação | Prioridade |
|---|---|---|---|---|---|
| Crítico | Não há implementação transacional de finalização de aplicação | Baixa parcial de estoque, histórico incompleto ou auditoria ausente em falha intermediária | Services de procedures inexistentes | Criar `proceduresService.finalizeProcedure()` com `BEGIN/COMMIT/ROLLBACK` | P0 |
| Crítico | Não há bloqueio de estoque negativo no banco | Um erro de código pode gerar lote ou estoque negativo | `inventory_items.current_stock`, `inventory_batches.current_quantity` sem CHECK >= 0 | Adicionar validação em service e constraints/checks quando seguro | P0 |
| Alto | `stock_movements.protocol_id` e `procedure_id` não têm FK | Risco de movimentação órfã | `001_initial.sql` | Referenciar `protocols(id)` e `procedures(id)` | P1 |
| Alto | `evolution_templates.applies_to_protocol_id` não tem FK | Risco de template apontando para protocolo inexistente | `001_initial.sql` | Adicionar FK para `protocols(id)` se não gerar ciclo problemático | P1 |
| Alto | Tabelas de backup não existem | Não há histórico ou rastreio de backup/restauração | Banco | Criar `backup_jobs`/`backup_history` ou equivalente | P1 |
| Alto | Tabelas de etiquetas não existem | Módulo de etiquetas não tem base persistente | Banco | Criar templates, print jobs e itens de etiqueta | P1 |
| Médio | Seeds usam hash placeholder | Login real não pode depender do seed atual | `002_seed_dev.sql` | Gerar hash real no fluxo de setup/admin | P1 |
| Médio | `body_areas` não tem `deleted_at` | Inativação histórica fica menos consistente | `001_initial.sql` | Adicionar soft delete se áreas forem editáveis | P2 |

Estrutura existente para os domínios solicitados:

| Domínio | Banco preparado? | Observação |
|---|---:|---|
| Pacientes | Sim | Tabela e CRUD parcial existem. |
| Estoque | Parcial | Tabelas existem; services/repositories/telas reais não. |
| Lotes | Parcial | Tabela existe; seleção e baixa não. |
| Materiais | Parcial | Representados por `inventory_items.item_type = material`; módulo não existe. |
| Medicamentos | Parcial | Representados por `inventory_items.item_type = medication`; módulo não existe. |
| Protocolos | Parcial | Tabelas existem; CRUD não. |
| Aplicações | Parcial | Tabelas existem; fluxo não. |
| Evolução | Parcial | Tabela de templates e campo `evolution_text`; geração não. |
| Auditoria | Parcial | Tabela e logger básico; não cobre ações críticas. |
| Relatórios | Não funcional | Dados base existem; services e telas reais não. |
| Backup | Não | Apenas setting seedado; sem tabelas ou fluxo. |
| Etiquetas | Não | Sem tabelas, QR/barcode ou preview. |

## 7. Services e repositories

Repositories existentes:

- `app/src/features/patients/repositories/patients.repository.ts`
- `app/src/features/audit/repositories/audit.repository.ts`

Services existentes:

- `app/src/features/patients/services/patients.service.ts`

Hooks/schemas existentes relevantes:

- `app/src/features/patients/hooks/usePatients.ts`
- `app/src/features/patients/schemas/patient.schema.ts`

Avaliação:

- Pacientes segue a separação correta: UI -> hook -> service -> repository -> SQLite.
- Auditoria existe como repository direto, chamado pelo service de pacientes.
- As telas de pacientes não acessam banco diretamente.
- O wrapper SQLite é centralizado em `app/src/lib/db/sqlite.ts`.

Services/repositories faltantes:

- `authService` / `authRepository`
- `dashboardService`
- `inventoryService` / `inventoryRepository`
- `batchService` / `batchRepository`
- `supplierService` / `supplierRepository`
- `protocolsService` / `protocolsRepository`
- `proceduresService` / `proceduresRepository`
- `stockMovementService` / `stockMovementRepository`
- `evolutionService`
- `reportsService`
- `auditService` ou ampliação do logger atual
- `backupService`
- `appointmentsService` / `appointmentsRepository`
- `appointmentSyncService`
- `settingsService` / `settingsRepository`
- `labelsService` / `labelsRepository`

Risco de regra de negócio espalhada:

- Ainda baixo em Pacientes, porque a camada está correta.
- Alto no futuro se Estoque/Aplicações forem implementados direto nas páginas, pois as regras críticas precisam viver em services transacionais.

## 8. Módulos funcionais

| Módulo | Classificação | Evidência |
|---|---:|---|
| Login | Precisa revisão | Tela visual existe, mas usa link `<a href="/dashboard">`, sem autenticação, sem hash, sem sessão. |
| Dashboard | Parcial | Tela existe, mas informa "em desenvolvimento" e não lê dados reais. |
| Pacientes | Funcional básico | Lista, busca, filtro, criar, editar e inativar via SQLite. |
| Prontuário | Parcial | Perfil e abas existem, mas histórico depende de procedures que ainda não são criadas; medicamentos e relatórios são placeholders. |
| Histórico do paciente | Parcial | Consulta `procedures`, mas não há fluxo que grave aplicações reais. |
| Estoque | Não iniciado | Página placeholder. |
| Medicamentos | Não iniciado | Link no menu sem rota/tela. |
| Materiais | Não iniciado | Link no menu sem rota/tela. |
| Lotes | Não iniciado | Tabela existe, mas não há UI/service. |
| Protocolos | Não iniciado | Página placeholder; tabelas existem. |
| Aplicações | Não iniciado | Link no menu e botão em Pacientes apontam para rota inexistente. |
| Evolução automática | Não iniciado | Template seedado, mas sem service de geração. |
| Relatórios | Não iniciado | Página placeholder; `window.print()` só aparece em aba do paciente como promessa. |
| Auditoria | Parcial | Logger registra ações de paciente, mas tela é placeholder e não há auditoria crítica. |
| Agenda | Não iniciado | Link no menu sem rota/tela. |
| Backup | Não iniciado | Link no menu sem rota/tela. |
| Etiquetas | Não iniciado | Sem módulo, tabela, service ou dependência. |
| Configurações | Não iniciado | Página placeholder; tabela settings existe. |

## 9. Funcionalidades faltantes

Faltam para completar o sistema conforme o README:

- Login real com validação contra `users`.
- Hash real de senha.
- Sessão local e logout real.
- Bloqueio por inatividade.
- Dashboard com métricas reais de estoque, agenda, vencimentos e consumo.
- CRUD completo de estoque.
- CRUD de medicamentos, materiais, equipamentos, categorias e fornecedores.
- CRUD de lotes.
- Alertas reais de validade e estoque mínimo.
- Controle de validade em 30 dias.
- Bloqueio de item vencido.
- Bloqueio de estoque negativo.
- Protocolos com itens padrão.
- Fluxo guiado de aplicação.
- Seleção de paciente/protocolo/área corporal/lote.
- Boneco SVG clicável.
- Bloqueio de áreas incompatíveis por via.
- Baixa automática de estoque.
- Transação SQLite na finalização da aplicação.
- Criação de `procedure_items_used`.
- Criação de `stock_movements`.
- Atualização de `inventory_batches.current_quantity`.
- Atualização de `inventory_items.current_stock`.
- Geração de evolução por template.
- Edição e salvamento da evolução.
- Copiar evolução com log de auditoria.
- Histórico real do paciente por aplicação.
- Relatório PDF completo do paciente.
- Relatórios de estoque, vencimento, consumo, lotes por paciente e pacientes por lote.
- Auditoria consultável.
- Hash chain de logs, se mantido como requisito.
- Backup manual.
- Backup automático.
- Restauração segura.
- Gerador de etiquetas.
- QR Code e código de barras.
- Preview e PDF de etiquetas.
- Agenda local.
- Integração opcional com Google Calendar via Apps Script.

## 10. UI/UX

Alinhamento visual:

- A paleta verde profunda, tons neutros e beige está preservada em `globals.css`.
- O visual é limpo e premium no layout base, login, splash, sidebar e pacientes.
- A sidebar minimizável existe e é funcional.
- Pacientes possui loading, erro e empty state.
- Modal de paciente possui validação visual e fluxo claro.

Lacunas de UI/UX:

| Severidade | Problema | Impacto | Onde ocorre | Recomendação |
|---|---|---|---|---|
| Alto | Menu tem links sem rotas | Usuário cai em fluxo quebrado | Sidebar | Adicionar rotas placeholder reais ou ocultar até implementar. |
| Alto | Login parece real, mas é só navegação | Falsa sensação de segurança | `LoginPage.tsx` | Implementar autenticação local antes de uso real. |
| Alto | Dashboard não mostra dados reais | Tela inicial não cumpre papel operacional | `DashboardPage.tsx` | Buscar métricas no SQLite. |
| Médio | Páginas principais são placeholders | Produto parece mais avançado do que é | Inventory, Protocols, Reports, Audit, Settings | Transformar em telas reais por fase. |
| Médio | Design-prototype tem fluxos completos, app real ainda não | Diferença entre referência visual e implementação | `design-prototype/` vs `app/src` | Usar protótipo como guia de telas, mas conectar dados reais. |
| Médio | Feedback global ausente | Mutations usam loading local, mas sem toast/sucesso/erro consistente | Pacientes e futuras telas | Criar camada de feedback. |
| Baixo | Uso de emoji/texto no botão de editar | Inconsistência com Lucide usado no resto | `PatientsPage.tsx` | Trocar por ícone Lucide em etapa de UI. |

Botões/fluxos sem ação ou quebrados:

- `Nova Aplicação` em Pacientes navega para `/procedures/new`, rota inexistente.
- `Reativar` paciente aparece, mas não chama `reactivatePatient`.
- Links `/agenda`, `/procedures`, `/medications`, `/materials`, `/backup` não existem no router.
- `Gerar PDF` no prontuário chama `window.print()` sem relatório real.
- Footer/perfil não tem logout real.

## 11. Segurança e LGPD

Estado atual:

- Não há autenticação real.
- Não há validação de senha.
- Não há hash real em runtime.
- Seed usa hash placeholder.
- Não há controle de sessão.
- Não há bloqueio por inatividade.
- Não há controle de acesso por role.
- Não há política de backup seguro.
- Não há criptografia de backup.
- Não há proteção adicional para dados sensíveis.
- CSP está `null` em `tauri.conf.json`.

Pontos positivos:

- Dados principais estão previstos para SQLite local.
- `deleted_at` existe em várias entidades.
- `audit_logs` existe.
- `clinic_id` prepara futuro multi-clínica.

Riscos:

| Severidade | Problema | Impacto | Onde ocorre | Recomendação |
|---|---|---|---|---|
| Crítico | Login apenas visual | Qualquer pessoa que acesse o app entra no sistema | `LoginPage.tsx` | Implementar auth local real. |
| Alto | CSP desabilitada | Aumenta superfície de risco no WebView | `tauri.conf.json` | Definir CSP compatível com app local. |
| Alto | Capability não inclui plugins usados | Funcionalidades Tauri podem falhar ou exigir permissões amplas depois | `default.json` | Declarar permissões mínimas por plugin. |
| Alto | Sem bloqueio por inatividade | Dados sensíveis expostos em computador aberto | Auth/session ausente | Implementar timer e lock screen. |
| Alto | Sem backup seguro | Perda de dados clínicos ou backup exposto | Backup ausente | Implementar backup com validação e opcional criptografia. |
| Médio | Auditoria sem hash chain | Logs podem ser alterados sem detecção | `audit_logs`/`audit.repository.ts` | Implementar hash anterior/atual se requisito for mantido. |

## 12. Auditoria interna

Estrutura existente:

- Tabela `audit_logs`.
- Campos para action, entity, before/after, device, hash e created_at.
- Repository `auditRepository.log()`.
- Registros para:
  - `patient_created`
  - `patient_updated`
  - `patient_deactivated`
  - `patient_reactivated` no service, embora o botão de UI não chame essa ação.

O sistema ainda não registra:

- Login realizado.
- Tentativa de login inválida.
- Logout.
- Criação/edição de estoque.
- Entrada de lote.
- Saída manual de estoque.
- Baixa automática.
- Tentativa de uso de item vencido.
- Tentativa de finalizar com estoque insuficiente.
- Criação/edição de protocolo.
- Atendimento iniciado/finalizado/cancelado.
- Geração/edição/cópia de evolução.
- Geração de relatório.
- Backup/restauração.
- Erros críticos.
- Sincronização de agenda.

Recomendação:

- Criar `auditService` para padronizar ações, entidade, descrição, usuário atual e hash chain.
- Fazer todos os services críticos dependerem dele, não as páginas.
- Expor tela de consulta com filtros por período, ação e entidade.

## 13. Relatórios e PDF

Estado atual:

- `ReportsPage.tsx` é placeholder.
- `PatientRecordPage.tsx` tem aba "Relatórios" com botão `window.print()`, mas sem montagem real do relatório.
- `pdf-lib` está instalado, mas não há service de PDF.

Base de dados disponível:

- Pacientes.
- Procedures.
- Procedure items.
- Inventory batches.
- Stock movements.
- Protocols.
- Evolution text.

Faltam:

- Service de relatórios.
- Queries agregadas.
- Tela de relatório de paciente.
- Tela de relatório de estoque.
- Tela de vencimentos.
- Relatório de consumo.
- Lotes por paciente.
- Pacientes por lote.
- Layout print-friendly.
- Auditoria de exportação.

Recomendação:

- Começar com HTML + CSS print conforme README.
- Só manter `pdf-lib` se houver necessidade real de montar PDF programaticamente.

## 14. Gerador de etiquetas

Estado atual: Não iniciado.

Não foram encontrados:

- Tabelas de templates de etiquetas.
- Tabelas de trabalhos de impressão.
- Tabelas de itens de impressão.
- Geração de QR Code.
- Geração de código de barras.
- Preview de etiqueta.
- PDF de etiquetas.
- Vínculo de etiqueta com item/lote/validade.
- Módulo `labels`.

Proposta mínima de base futura:

- `label_templates`
- `label_print_jobs`
- `label_print_items`
- Campos para `inventory_item_id`, `inventory_batch_id`, `batch_number_snapshot`, `expiration_date_snapshot`, `qr_payload`, `barcode_value`, `printed_at`, `created_by_user_id`.

## 15. Erros encontrados

Verificação executada:

```txt
npm.cmd exec tsc -- --noEmit
```

Resultado: falhou.

Erros principais:

| Severidade | Problema | Impacto | Onde ocorre | Recomendação | Prioridade |
|---|---|---|---|---|---|
| Crítico | Typecheck falha no formulário por incompatibilidade entre Zod/RHF | App não deve ser considerado compilável | `PatientFormModal.tsx` | Ajustar schema/default/type do resolver | P0 |
| Crítico | Rota do prontuário usa id errado no TanStack Router | Navegação/tipagem quebra | `PatientRecordPage.tsx` | Usar rota real registrada ou revisar shell route | P0 |
| Crítico | Navegação para `/procedures/new` inexistente | Botão "Nova Aplicação" quebra | `PatientsPage.tsx` | Criar rota/módulo ou remover ação temporária | P0 |
| Alto | Tipo de `dbExecute` incompatível com retorno do plugin SQL | Typecheck falha e camada DB fica incorreta | `sqlite.ts` | Ajustar retorno para `QueryResult` ou tipo compatível | P0 |
| Alto | Login sem autenticação | Sistema sem barreira real | `LoginPage.tsx` | Implementar auth antes de uso real | P0 |
| Alto | Capabilities Tauri incompletas | SQL/FS/dialog/clipboard/notificações podem falhar | `default.json` | Declarar permissões mínimas necessárias | P1 |
| Médio | Arquivos template Vite/Tauri sobrando | Confusão e código morto | `app/src/App.tsx`, `App.css`, assets | Remover com verificação de imports | P2 |
| Médio | CSP desabilitada | Risco de segurança | `tauri.conf.json` | Definir CSP | P2 |

## 16. Riscos técnicos

| Severidade | Risco | Impacto | Mitigação |
|---|---|---|---|
| Crítico | Implementar baixa de estoque sem transação | Dados clínicos e estoque inconsistentes | Criar service transacional antes de UI avançada. |
| Crítico | Prosseguir com typecheck quebrado | Defeitos acumulados e build instável | Corrigir erros P0 antes de novas features. |
| Alto | Rotas visíveis sem módulo | UX quebrada e falsa impressão de produto pronto | Ajustar router/sidebar em fase de fundação. |
| Alto | Auditoria incompleta | Baixa rastreabilidade e risco LGPD | Centralizar audit service. |
| Alto | Sem permissões Tauri corretas | Funcionalidades locais falham em runtime | Revisar capabilities por plugin. |
| Alto | Sem backup | Perda de dados sensíveis | Implementar backup manual cedo. |
| Médio | Banco forte, services ausentes | UI pode começar a duplicar regras | Criar services antes de telas complexas. |
| Médio | Dependências instaladas antes do uso | Superfície e bundle crescem | Reavaliar `pdf-lib`, store e notification por fase. |

## 17. Melhorias recomendadas

Recomendações de fundação:

- Corrigir typecheck antes de avançar módulos.
- Resolver estratégia de rotas: registrar placeholders reais ou ocultar links.
- Implementar autenticação local real.
- Ajustar capabilities Tauri.
- Criar `auth`, `inventory`, `protocols`, `procedures`, `reports`, `backup`, `appointments`, `settings` e `labels` seguindo o padrão de Pacientes.
- Remover arquivos template somente depois de verificar imports.

Recomendações de domínio:

- Implementar estoque e lotes antes de aplicações.
- Implementar protocolos antes de finalização de aplicação.
- Criar finalização transacional como service central.
- Criar audit service antes de estoque/aplicações, para não esquecer logs.
- Criar queries de dashboard a partir de dados reais.

Recomendações de UI:

- Usar protótipo como referência visual, mas priorizar dados reais.
- Criar empty/loading/error states padronizados.
- Criar toasts/feedback de sucesso e falha.
- Evitar botões visíveis sem rota/ação.
- Usar Lucide em todos os botões de ação.

## 18. Plano de implementação

### Fase 1 - Corrigir fundação

Objetivo: deixar app compilável, navegável e com permissões coerentes.

Arquivos/módulos envolvidos:

- `app/src/app/router.tsx`
- `app/src/components/layout/Sidebar.tsx`
- `app/src/features/patients/components/PatientFormModal.tsx`
- `app/src/lib/db/sqlite.ts`
- `app/src-tauri/capabilities/default.json`
- `app/src/App.tsx`, `app/src/App.css`, `app/src/assets/react.svg`

Tarefas:

- Corrigir erros de `tsc --noEmit`.
- Corrigir rotas internas do TanStack Router.
- Resolver links sem rota.
- Ajustar permissões Tauri.
- Revisar arquivos de template.

Critérios de aceite:

- `npm.cmd exec tsc -- --noEmit` passa.
- Nenhum link principal leva para rota inexistente.
- Capabilities refletem plugins usados.

Dependências: nenhuma.

Prioridade: P0.

### Fase 2 - Banco e migrations

Objetivo: consolidar integridade do schema antes de regras críticas.

Arquivos/módulos envolvidos:

- `app/src/lib/db/migrations/*`
- `app/src-tauri/src/lib.rs`
- `app/src/lib/db/sqlite.ts`

Tarefas:

- Adicionar FKs ausentes em movimentações/templates quando seguro.
- Avaliar constraints para estoque/lotes não negativos.
- Planejar migrations de backup e etiquetas.
- Definir padrão de transações.

Critérios de aceite:

- Schema cobre estoque, aplicação, auditoria, backup e etiquetas.
- Constraints não quebram seeds.
- Migrations rodam em instalação limpa.

Dependências: Fase 1.

Prioridade: P0/P1.

### Fase 3 - Pacientes e prontuário real

Objetivo: estabilizar CRUD e prontuário.

Arquivos/módulos envolvidos:

- `features/patients/*`
- `features/audit/*`

Tarefas:

- Corrigir reativação.
- Melhorar feedback de mutations.
- Completar dados do prontuário.
- Garantir auditoria de criação/edição/inativação.

Critérios de aceite:

- Criar, editar, inativar e reativar paciente.
- Histórico mostra apenas dados reais.
- Erros aparecem de forma clara.

Dependências: Fase 1.

Prioridade: P1.

### Fase 4 - Estoque, medicamentos, materiais e lotes

Objetivo: criar domínio real de inventário.

Arquivos/módulos envolvidos:

- `features/inventory`
- `features/medications`
- `features/materials`
- `features/batches`
- `features/suppliers`

Tarefas:

- CRUD de itens.
- CRUD de lotes.
- Entrada de estoque.
- Estoque mínimo.
- Alertas de vencimento.
- Bloqueio de negativo.

Critérios de aceite:

- Item pode ter lote e validade.
- Entrada cria lote/movimentação.
- Estoque atual reflete lotes.
- Alertas funcionam com dados reais.

Dependências: Fases 1 e 2.

Prioridade: P1.

### Fase 5 - Protocolos

Objetivo: permitir protocolos com itens padrão e template de evolução.

Arquivos/módulos envolvidos:

- `features/protocols`
- `features/evolution`
- `features/inventory`

Tarefas:

- CRUD de protocolos.
- Adicionar/remover itens padrão.
- Vínculo com via de aplicação.
- Template de evolução por protocolo.

Critérios de aceite:

- Protocolo ativo aparece para aplicação.
- Itens padrão carregam com quantidades.
- Via principal é respeitada.

Dependências: Fase 4.

Prioridade: P1.

### Fase 6 - Aplicações e baixa automática

Objetivo: implementar fluxo crítico de atendimento.

Arquivos/módulos envolvidos:

- `features/procedures`
- `features/inventory`
- `features/protocols`
- `features/audit`

Tarefas:

- Fluxo em etapas.
- Seleção de paciente.
- Seleção de protocolo.
- Seleção de área corporal.
- Seleção de lotes.
- Conferência.
- Finalização transacional.
- Baixa automática.

Critérios de aceite:

- Finalização usa transação SQLite.
- Sem lote obrigatório não finaliza.
- Sem estoque suficiente não finaliza.
- Finalizado cria procedure, procedure_items_used, stock_movements e audit_logs.

Dependências: Fases 4 e 5.

Prioridade: P0/P1.

### Fase 7 - Evolução automática e histórico

Objetivo: gerar evolução por template e registrar histórico real.

Arquivos/módulos envolvidos:

- `features/evolution`
- `features/procedures`
- `features/patients`

Tarefas:

- Resolver variáveis do template.
- Permitir edição antes de finalizar.
- Copiar evolução.
- Registrar log ao copiar/editar.

Critérios de aceite:

- Evolução salva no atendimento.
- Cópia funciona e audita.
- Histórico do paciente exibe evolução real.

Dependências: Fase 6.

Prioridade: P1.

### Fase 8 - Relatórios e PDF

Objetivo: gerar relatórios operacionais e clínicos.

Arquivos/módulos envolvidos:

- `features/reports`
- `lib/pdf` ou `lib/print`

Tarefas:

- Relatório do paciente.
- Relatório de estoque.
- Vencimentos.
- Consumo.
- Lotes por paciente.
- Pacientes por lote.
- Impressão/PDF.

Critérios de aceite:

- Relatórios usam dados reais.
- Layout de impressão é legível.
- Exportação é auditada.

Dependências: Fases 4, 6 e 7.

Prioridade: P2.

### Fase 9 - Auditoria real

Objetivo: ampliar auditoria para todos os eventos críticos.

Arquivos/módulos envolvidos:

- `features/audit`
- Todos os services críticos

Tarefas:

- Criar `auditService`.
- Padronizar ações.
- Implementar before/after.
- Implementar tela de consulta.
- Avaliar hash chain.

Critérios de aceite:

- Eventos críticos aparecem no log.
- Logs são filtráveis.
- Logs não são editáveis pela UI.

Dependências: Pode começar após Fase 1; deve estar integrado até Fase 6.

Prioridade: P1.

### Fase 10 - Backup/restauração

Objetivo: proteger dados locais.

Arquivos/módulos envolvidos:

- `features/backup`
- Tauri FS/dialog
- Migrations de backup, se adotadas

Tarefas:

- Backup manual.
- Escolha de pasta.
- Validação do arquivo.
- Restauração com cópia preventiva.
- Auditoria.
- Backup automático.

Critérios de aceite:

- Backup pode ser criado e restaurado.
- Restauração preserva cópia anterior.
- Ações são auditadas.

Dependências: Fases 1 e 2.

Prioridade: P1/P2.

### Fase 11 - Gerador de etiquetas

Objetivo: preparar e imprimir etiquetas com lote/validade.

Arquivos/módulos envolvidos:

- `features/labels`
- `features/inventory`
- `lib/pdf` ou `lib/print`

Tarefas:

- Tabelas de templates/jobs/itens.
- QR Code/código de barras.
- Preview.
- PDF/print.
- Vínculo com lote.

Critérios de aceite:

- Etiqueta identifica item, lote e validade.
- Preview confere com impressão.
- Geração é auditada.

Dependências: Fase 4.

Prioridade: P2.

### Fase 12 - Agenda/Google Calendar, se aplicável

Objetivo: criar agenda local e sync opcional.

Arquivos/módulos envolvidos:

- `features/appointments`
- `features/appointment-sync`
- `settings`

Tarefas:

- CRUD de agendamentos.
- Status.
- Configuração de Apps Script.
- Sync opcional.
- Retry.
- Auditoria.

Critérios de aceite:

- Agenda funciona offline.
- Sync falha sem quebrar app.
- Status de sincronização é persistido.

Dependências: Fase 1 e pacientes.

Prioridade: P3.

### Fase 13 - Testes e refinamento final

Objetivo: estabilizar o MVP.

Arquivos/módulos envolvidos:

- Todo o app

Tarefas:

- Typecheck.
- Build Tauri/frontend.
- Testes manuais de fluxos críticos.
- Teste de banco limpo.
- Teste de backup/restauração.
- Teste de relatórios.
- Revisão visual contra protótipo.

Critérios de aceite:

- App funciona sem internet.
- Fluxo de aplicação é rastreável.
- Estoque não fica inconsistente.
- Relatórios e backup funcionam.

Dependências: fases anteriores.

Prioridade: P1 final.

## 19. Prioridades

Top 5 prioridades urgentes:

1. Corrigir o typecheck (`tsc --noEmit`) e estabilizar rotas.
2. Implementar login local real com sessão, hash de senha e bloqueio básico.
3. Ajustar capabilities Tauri para SQL/FS/dialog/clipboard/store/notification conforme uso real.
4. Implementar domínio de estoque/lotes com bloqueio de negativo e alertas de validade/estoque mínimo.
5. Implementar finalização transacional de aplicação com baixa automática, histórico, evolução e auditoria.

Prioridade P0:

- Typecheck.
- Rotas quebradas.
- Login real.
- Transação de finalização.
- Bloqueio de estoque negativo.

Prioridade P1:

- Estoque/lotes.
- Protocolos.
- Auditoria real.
- Backup manual.
- Prontuário/histórico real.

Prioridade P2:

- Relatórios/PDF.
- Etiquetas.
- Backup automático.
- UI refinada.

Prioridade P3:

- Google Calendar via Apps Script.
- Preparação SaaS avançada.

## 20. Checklists finais

### Checklist de erros críticos

- [ ] Corrigir erros de TypeScript em `PatientFormModal.tsx`.
- [ ] Corrigir rota de `PatientRecordPage.tsx`.
- [ ] Corrigir/remover navegação para `/procedures/new` enquanto a rota não existir.
- [ ] Ajustar tipo de retorno de `dbExecute`.
- [ ] Implementar login real.
- [ ] Garantir que menu não tenha links quebrados.
- [ ] Definir permissões Tauri mínimas para plugins usados.

### Checklist de funcionalidades faltantes

- [ ] Dashboard real.
- [ ] Estoque real.
- [ ] Medicamentos.
- [ ] Materiais.
- [ ] Lotes.
- [ ] Fornecedores.
- [ ] Protocolos.
- [ ] Aplicações.
- [ ] Boneco SVG clicável.
- [ ] Seleção de lote.
- [ ] Baixa automática.
- [ ] Evolução automática.
- [ ] Copiar evolução com auditoria.
- [ ] Histórico real por paciente.
- [ ] Relatórios.
- [ ] PDF.
- [ ] Backup.
- [ ] Restauração.
- [ ] Agenda.
- [ ] Google Calendar opcional.
- [ ] Etiquetas.

### Checklist de banco de dados

- [x] Migrations existem.
- [x] Tabelas principais do README existem.
- [x] `clinic_id` existe nas principais tabelas.
- [x] `created_at` existe nas principais tabelas.
- [ ] Revisar `updated_at`/`deleted_at` nas tabelas append-only/editáveis.
- [ ] Adicionar FKs ausentes em `stock_movements`.
- [ ] Avaliar constraints de quantidade não negativa.
- [ ] Criar tabelas de backup.
- [ ] Criar tabelas de etiquetas.
- [ ] Validar schema em banco limpo.

### Checklist de UI/UX

- [x] Protótipo preservado.
- [x] Paleta base aplicada.
- [x] Sidebar minimizável.
- [x] Empty/loading/error states em Pacientes.
- [ ] Dashboard completo.
- [ ] Remover ou implementar links sem rota.
- [ ] Criar toasts/feedback global.
- [ ] Completar estados vazios de todos os módulos.
- [ ] Criar fluxo em etapas para aplicação.
- [ ] Implementar modais reais de estoque/protocolos.
- [ ] Revisar consistência visual contra protótipo.

### Checklist de segurança

- [ ] Login real.
- [ ] Hash de senha real.
- [ ] Sessão local.
- [ ] Logout real.
- [ ] Bloqueio por inatividade.
- [ ] CSP configurada.
- [ ] Capabilities Tauri revisadas.
- [ ] Auditoria ampliada.
- [ ] Backup seguro.
- [ ] Restauração segura.
- [ ] Política para dados sensíveis.
- [ ] Preparação para controle de acesso futuro.

### Checklist de relatórios

- [ ] Relatório completo do paciente.
- [ ] Relatório de estoque.
- [ ] Relatório de vencimento.
- [ ] Relatório de consumo.
- [ ] Relatório de lotes por paciente.
- [ ] Relatório de pacientes por lote.
- [ ] Layout de impressão.
- [ ] Exportação/PDF.
- [ ] Auditoria de geração de relatório.

### Checklist de etiquetas

- [ ] Tabela de templates de etiquetas.
- [ ] Tabela de trabalhos de impressão.
- [ ] Tabela de itens de impressão.
- [ ] QR Code.
- [ ] Código de barras.
- [ ] Preview.
- [ ] PDF/print.
- [ ] Vínculo com item.
- [ ] Vínculo com lote.
- [ ] Vínculo com validade.
- [ ] Auditoria de impressão.

### Checklist de próximos passos

- [ ] Corrigir fundação técnica.
- [ ] Validar typecheck.
- [ ] Ajustar rotas e sidebar.
- [ ] Implementar auth real.
- [ ] Implementar estoque/lotes.
- [ ] Implementar protocolos.
- [ ] Implementar aplicação transacional.
- [ ] Implementar evolução e histórico.
- [ ] Implementar auditoria real.
- [ ] Implementar backup.
- [ ] Implementar relatórios.
- [ ] Implementar etiquetas.
- [ ] Rodar validação final do MVP.
