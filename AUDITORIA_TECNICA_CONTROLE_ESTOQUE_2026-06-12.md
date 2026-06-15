# Auditoria Tecnica Completa - Controle de Estoque Dra. Ana Morong

Data: 2026-06-12  
Escopo: auditoria diagnostica, sem correcao automatica, sem mock, sem recriar banco e sem apagar dados.  
Banco real auditado: `C:\Users\wilia\AppData\Roaming\com.anamorong.estoque\estoque.db` em modo somente leitura.

## 1. Resumo executivo

O sistema esta parcialmente conectado e o estado final do checkout passa em typecheck e build, mas ha riscos funcionais importantes que o build nao captura:

- O banco real esta integro (`PRAGMA integrity_check = ok`) e sem violacoes de foreign key (`PRAGMA foreign_key_check = 0`).
- O registro formal de migrations no banco real esta apenas em `1..12`, enquanto o codigo Tauri registra migrations `1..19` e o runtime aplica auto-patches em `sqlite.ts`.
- O schema real esta em estado hibrido: contem algumas colunas/tabelas de fases novas por auto-patch, mas ainda nao contem colunas exigidas por consultas de procedimentos e correcao.
- Fluxos de pacientes e estoque basico estao melhor estruturados, mas aplicacoes/procedimentos, correcao, reserva de estoque, XML, localizacao de estoque e QR Code/leitura de lote ainda estao parcialmente conectados.
- O banco real atual tem poucos dados operacionais ativos: `patients=0`, `protocols=0`, `procedures=0`, `appointments=0`, `inventory_items=1` porem o item esta inativo/deletado. Por isso, fluxos de escrita nao foram executados contra o banco real.

## 2. Estado geral do sistema

| Area | Estado | Evidencia |
| --- | --- | --- |
| Build/typecheck | Funcionando no estado final | `npm.cmd exec tsc -- --noEmit` passou; `npm.cmd run build` passou |
| Banco real | Integro, mas defasado formalmente | `_sqlx_migrations` registra apenas versions `1..12` |
| Arquitetura UI -> Service -> Repository -> SQLite | Parcial | Repositories usam SQLite, mas alguns services tambem acessam `dbSelect`, `dbExecute`, `dbTransaction` ou `getDb` diretamente |
| Rotas/menu | Funcionando | Sidebar aponta para rotas existentes: dashboard, agenda, patients, procedures, protocols, inventory, medications, materials, equipment, labels, reports, audit, settings, backup |
| Dados reais | Ambiente quase vazio | Nao ha pacientes, protocolos, procedimentos, agenda nem lotes ativos no banco real |
| Aplicacoes/procedimentos | Parcial/quebrado em runtime | Queries usam colunas ausentes no banco real |
| Estoque/rastreabilidade | Parcial | Ha movimento sem lote para item que exige lote |

## 3. Arquitetura e fronteiras

O desenho principal existe:

- Rotas em `app/src/app/router.tsx`.
- Menu em `app/src/components/layout/Sidebar.tsx`.
- Features separadas por dominio: `agenda`, `patients`, `procedures`, `inventory`, `protocols`, `reports`, `labels`, `settings`, `backup`, `audit`, `integrations`.
- Wrapper SQLite central em `app/src/lib/db/sqlite.ts`.
- Migrations Tauri registradas em `app/src-tauri/src/lib.rs`.

Problemas de fronteira encontrados:

- `app/src/lib/db/sqlite.ts:22` inicia auto-patch em runtime, o que mascara migrations nao aplicadas.
- `app/src/lib/db/sqlite.ts:41` cria tabelas/colunas de localizacao em runtime, fora da trilha formal de migration registrada.
- `app/src/features/agenda/services/appointmentStockValidation.service.ts:1` importa `getDb` diretamente no service e executa SQL no service.
- `app/src/features/patients/services/patientApplicationReportPreview.service.ts:1` acessa `dbSelect` direto no service.
- `app/src/features/import-export/services/dataExport.service.ts:6`, `patientMerge.service.ts:3`, `checkinSync.service.ts:4`, `IntegrationOrchestrator.service.ts:5` e `patientReportEmail.service.ts:1` tambem usam SQLite direto em services.
- Alguns usos diretos de `dbTransaction` em services sao justificaveis para orquestracao transacional, mas o SQL bruto dentro de service deve ser movido para repository quando representar persistencia propria.

## 4. Banco de dados real

Resultado da inspecao:

- Caminho: `C:\Users\wilia\AppData\Roaming\com.anamorong.estoque\estoque.db`
- Tamanho: `573440` bytes
- `PRAGMA user_version`: `0`
- `PRAGMA integrity_check`: `ok`
- `PRAGMA foreign_key_check`: `0`
- Migrations aplicadas formalmente: `1..12`
- Migrations registradas no codigo Tauri: `1..19`

Tabelas esperadas e contagens no banco real:

| Tabela | Registros |
| --- | ---: |
| patients | 0 |
| inventory_items | 1 |
| inventory_batches | 0 |
| stock_movements | 1 |
| protocols | 0 |
| protocol_items | 0 |
| procedures | 0 |
| procedure_items_used | 0 |
| appointments | 0 |
| body_areas | 42 |
| administration_routes | 6 |
| suppliers | 1 |
| audit_logs | 17 |
| settings | 22 |

Colunas ausentes que o codigo ainda tenta usar:

- `body_areas.technical_name` e `body_areas.canonical_slug`: previstas na migration 13, ausentes no banco real.
- `procedures.is_corrected`, `procedures.corrected_at`, `procedures.correction_reason`: previstas na migration 16, ausentes no banco real.
- `procedure_items_used.corrected_at`: usada pelo codigo, mas nao criada por nenhuma migration inspecionada.
- `inventory_batches.status`: usada na validacao de estoque da agenda, ausente no banco real.

## 5. Modulos funcionando

- Autenticacao/login: estrutura presente e isolada em service/repository.
- Dashboard: usa dados reais via `dashboard.repository.ts`; com o banco atual deve exibir estado vazio/zerado.
- Pacientes: CRUD e prontuario base seguem service/repository; o contrato de prontuario ja diferencia `found`, `partial`, `not_found`, `deleted` e `merged`.
- Estoque basico: cadastro/listagem/entrada manual estao estruturados e usam repositories.
- Etiquetas: gera job e item de etiqueta a partir de lote com payload `CESTQ:BATCH:{batchId}`.
- Relatorios: consultas principais usam dados reais via repository.
- Auditoria: tabela existe, ha 17 registros reais, service/repository presentes.
- Backup: exporta/restaura o arquivo `estoque.db` via APIs Tauri, com confirmacao visual na pagina.

## 6. Modulos parcialmente funcionando

- Agenda: cria/edita agendamentos, mas validacao de estoque quebra ao usar `inventory_batches.status`; vinculo reverso plano -> agendamento tambem e incompleto.
- Prontuario: paciente base e historico resumido estao protegidos, mas historico completo de procedimentos pode quebrar por colunas de correcao ausentes.
- Aplicacoes/procedimentos: finalizar aplica estoque e cria movimento, mas `createItem` usa coluna ausente e a correcao depende de schema nao aplicado.
- Protocolos: CRUD existe, mas nao ha dados reais para validar; reserva de estoque depende de agenda e protocol_items.
- Estoque por local/armario: tabelas existem por auto-patch, mas a movimentacao principal nao grava `location_id` nas entradas/saidas.
- Importacao XML: compila no estado final, mas ainda tem workaround funcional e caminhos que podem registrar movimento com batch vazio.
- Configuracoes/integracoes: settings persistidas existem, mas `appscript_enabled=true` com URLs/chaves vazias cria risco de integracao habilitada sem endpoint.
- QR Code: gera QR, mas nao foi encontrada rota/fluxo de leitura que resolva `CESTQ:BATCH:{batchId}` para abrir o lote correto.

## 7. Modulos quebrados ou com alto risco runtime

- Correcao de procedimento: depende de `procedures.is_corrected`, `procedures.corrected_at`, `procedures.correction_reason` e `procedure_items_used.corrected_at`, ausentes no banco real.
- Historico completo de procedimento: `procedures.repository.ts` consulta colunas de correcao ausentes.
- Validacao de estoque da agenda: `appointmentStockValidation.service.ts` consulta `inventory_batches.status`, ausente no banco real.

## 8. Problemas criticos

1. Schema real defasado formalmente e parcialmente remendado por auto-patch.
   - Evidencia: `_sqlx_migrations` somente `1..12`; `lib.rs` registra migrations `13`, `16` e `19`; `sqlite.ts:22` e `sqlite.ts:41` aplicam auto-patches.
   - Risco: duas instalacoes podem ter schemas diferentes mesmo com o mesmo codigo.
   - Correcao recomendada: remover a dependencia de auto-patch como mecanismo principal e criar um caminho de migration idempotente/compatibilidade validado contra bancos `1..12`.

2. Procedimentos/correcoes usam colunas ausentes no banco real.
   - Evidencia: `procedures.repository.ts:250` consulta `p.is_corrected`, `p.correction_reason`, `p.corrected_at`; `procedureCorrection.service.ts:214-216` atualiza essas colunas.
   - Validacao read-only: `SELECT p.is_corrected FROM procedures p LIMIT 1` falha com `no such column: p.is_corrected`.
   - Correcao recomendada: aplicar migration segura para colunas faltantes ou tornar as queries compatíveis com schema antigo antes de acessar essas colunas.

3. `procedure_items_used.corrected_at` e usado mas nao existe.
   - Evidencia: `procedures.repository.ts:136` insere `corrected_at`; `procedureCorrection.service.ts:136` atualiza `corrected_at`.
   - Validacao read-only: `SELECT pi.corrected_at FROM procedure_items_used pi LIMIT 1` falha com `no such column: pi.corrected_at`.
   - Correcao recomendada: decidir se `corrected_at` pertence mesmo a `procedure_items_used`; se sim, criar migration idempotente e ajustar queries.

4. Validacao de estoque para agenda usa coluna inexistente.
   - Evidencia: `appointmentStockValidation.service.ts:65` filtra `inventory_batches.status = 'active'`.
   - Validacao read-only: `SELECT id FROM inventory_batches WHERE status = 'active' LIMIT 1` falha com `no such column: status`.
   - Correcao recomendada: usar `deleted_at IS NULL`, `current_quantity > 0` e validade, ou adicionar coluna formalmente se for regra de negocio real.

## 9. Problemas altos

1. Criar plano de aplicacao com data cria agendamento sem preencher `appointments.application_plan_id`.
   - Evidencia: `patientApplications.service.ts:23` chama `appointmentsService.createAppointment` antes de criar o plano; a chamada nao envia `application_plan_id`.
   - Impacto: consultas de reserva usam `appointments.application_plan_id`; agenda e plano podem ficar ligados so por `patient_application_plans.appointment_id`.
   - Correcao recomendada: criar plano primeiro e depois agendamento com `application_plan_id`, ou atualizar o appointment apos criar o plano em transacao.

2. Atualizacao de agendamento nao carrega o agendamento pelo ID.
   - Evidencia: `appointments.service.ts:59` chama `findByPatient(data.patient_id ?? "")` com comentario indicando que nao retorna por ID.
   - Impacto: reagendamento pode nao sincronizar corretamente plano vinculado.
   - Correcao recomendada: criar `appointmentsRepository.findById` e usar o appointment real como fonte.

3. Estoque por local nao acompanha movimentacoes principais.
   - Evidencia: `inventoryReceipt.service.ts` adiciona local apenas se `input.locationId`; `stockMovementRepository.createEntry/createExit` nao gravam `location_id`.
   - Banco real: `inventory_location_stocks` esta vazio.
   - Impacto: relatorio por local/armario pode divergir do estoque geral.
   - Correcao recomendada: incluir `location_id` nas entradas, saidas, ajustes e aplicacoes, com fallback claro para local padrao.

4. Importacao XML ainda tem workaround operacional.
   - Evidencia: `inventoryReceipt.service.ts:280-287` contem bloco de workaround para lote existente; `inventoryReceipt.service.ts:314-316` passa `inventoryBatchId: batchId || ""`.
   - Impacto: itens sem lote podem gerar movimento com `inventory_batch_id` vazio, arriscando FK/orfandade.
   - Correcao recomendada: mover XML para repository/service consistente, permitir `inventoryBatchId` nulo quando a regra permitir e validar lote obrigatorio por tipo.

5. Integracoes aparecem habilitadas sem configuracao.
   - Evidencia no banco real: `appscript_enabled=true`, `appscript_calendar_enabled=true`, `appscript_email_enabled=true`, mas URLs/chaves estao vazias.
   - Impacto: tentativas de sync podem falhar silenciosamente ou gerar erros operacionais.
   - Correcao recomendada: bloquear status habilitado sem endpoint/API key ou exibir estado "configuracao incompleta".

## 10. Problemas medios

- Existe `appointments/pages/AppointmentsPage.tsx` com `UnderConstructionPage`, mas a rota ativa usa `agenda/pages/AgendaPage.tsx`; manter pagina antiga aumenta confusao de manutencao.
- Varios components ainda usam `alert`/`window.confirm`, por exemplo `AppointmentModal.tsx` e paginas de fornecedores/locais; isso funciona, mas prejudica UX e padronizacao.
- O banco real tem `inventory_items.current_stock=20` em item deletado/inativo. Como consultas ativas filtram `deleted_at`, o dado nao aparece na UI, mas permanece como historico residual.
- O unico fornecedor real tambem esta deletado/inativo, entao modulos de compra/entrada podem parecer vazios apesar de haver historico.

## 11. Problemas baixos

- Textos e comentarios ainda aparecem com acentuacao corrompida em alguns arquivos/outputs, o que dificulta manutencao.
- `PRAGMA user_version` esta `0`; a trilha real de versao depende apenas de `_sqlx_migrations`.
- Rotas de relatorio e etiquetas existem, mas QR Code nao tem fluxo de leitura/consulta dedicado.

## 12. Falhas de interconexao obrigatorias

| Fluxo | Estado | Causa/evidencia | Correcao necessaria |
| --- | --- | --- | --- |
| 1. Criar paciente -> abrir prontuario | Parcialmente funcionando | CRUD e `getPatientRecord` existem; banco real nao tem pacientes para validar escrita real | Manter estados explicitos e testar com dado real existente/criado em copia controlada |
| 2. Criar item -> criar lote -> entrada | Parcialmente funcionando | Entrada manual cria recibo, lote, movimento e incrementa estoque | Amarrar `location_id` e validar lote obrigatorio em todos os caminhos |
| 3. Criar protocolo -> vincular itens reais | Nao verificavel com dados atuais | `protocols=0`, `protocol_items=0`; CRUD existe | Criar teste controlado em copia do banco; validar item inativo/deletado |
| 4. Agendar aplicacao -> reservar estoque | Quebrado/parcial | Validacao usa `inventory_batches.status`; vinculo appointment/plan e incompleto | Corrigir query de lotes e sincronizar `appointments.application_plan_id` |
| 5. Executar aplicacao -> selecionar area/lote/itens | Parcial | UI e services existem; area/lote dependem de schema e dados | Corrigir colunas ausentes e validar lote requerido |
| 6. Finalizar aplicacao -> baixar estoque -> movimento -> evolucao -> prontuario | Quebrado em runtime | `createItem` tenta inserir `procedure_items_used.corrected_at`, ausente | Corrigir schema/query antes de confiar no fluxo |
| 7. Corrigir aplicacao -> ajustar estoque -> auditoria -> historico | Quebrado | `procedureCorrection.service.ts` usa colunas ausentes em `procedures` e `procedure_items_used` | Migration/compatibilidade para colunas de correcao |
| 8. Relatorio de compra -> estoque atual/reservado/minimo/custo | Parcial | Purchase plan existe; reserva depende de agenda/planos | Corrigir reserva de estoque e localizacao |
| 9. Etiqueta QR Code -> abrir lote correto | Parcial | QR payload e gerado, mas nao ha rota/leitor para resolver lote | Criar fluxo de leitura/consulta por payload |
| 10. Backup/restauracao -> preservar banco | Parcial | Backup copia arquivo; restore sobrescreve banco atual | Validar integridade/migration apos restore antes de reabrir app |

## 13. Inconsistencias no banco

- Nenhuma violacao de FK detectada por `PRAGMA foreign_key_check`.
- Nenhum estoque negativo em item ativo ou lote ativo.
- Nenhum protocolo quebrado, porque nao ha protocolos/itens.
- Nenhum appointment/plano quebrado, porque nao ha registros.
- Movimento inconsistente: `stock_movements.id=96ac8563-bc22-4608-b603-c120a118c834` aponta para item que exige lote (`requires_batch=1`), mas `inventory_batch_id` esta `NULL`.
- Item residual: `Acido Lipoico`, `current_stock=20`, `minimum_stock=10`, `is_active=0`, `deleted_at=2026-06-12 14:23:22`.
- Fornecedor residual: `Essentia`, `is_active=0`, `deleted_at=2026-06-12 14:23:24`.

## 14. Inconsistencias no estoque e rastreabilidade

- Soma de lotes vs estoque atual nao diverge para itens ativos, mas nao ha lotes ativos.
- Ha movimento sem lote para item que exige lote.
- `inventory_location_stocks` esta vazio.
- `stock_movements.location_id` existe no schema, mas repositories de movimento nao populam o campo.
- Aplicacoes ainda podem baixar estoque geral e lote, mas nao atualizam estoque por local/armario.
- Relatorios de estoque usam dados reais, mas podem esconder historico residual por filtros de `deleted_at`.

## 15. Telas com problemas ou risco

- Agenda: validacao de estoque quebra por coluna inexistente em lote.
- Aplicacoes/Procedimentos: historico/correcao/finalizacao podem quebrar por colunas ausentes.
- Entrada XML: fluxo compila, mas tem workaround e risco de movimento com batch vazio.
- Etiquetas: gera e imprime, mas nao ha leitura/consulta QR para abrir lote.
- Configuracoes/Integracoes: permite flags habilitadas com URL/chave vazias.
- Backup: restore sobrescreve banco; precisa validacao pos-restore antes de considerar seguro.

## 16. Queries quebradas confirmadas

Consultas testadas em modo leitura contra o banco real:

- `SELECT p.is_corrected, p.correction_reason, p.corrected_at FROM procedures p LIMIT 1`
  - Resultado: `ERROR: no such column: p.is_corrected`
  - Codigo relacionado: `procedures.repository.ts:250`, `procedureCorrection.service.ts:214-216`
- `SELECT pi.corrected_at FROM procedure_items_used pi LIMIT 1`
  - Resultado: `ERROR: no such column: pi.corrected_at`
  - Codigo relacionado: `procedures.repository.ts:136`, `procedureCorrection.service.ts:136`
- `SELECT technical_name, canonical_slug FROM body_areas LIMIT 1`
  - Resultado: `ERROR: no such column: technical_name`
  - Codigo relacionado: migration 13 nao aplicada formalmente; codigo atual usa fallback em alguns pontos, mas o schema esperado nao existe.
- `SELECT id FROM inventory_batches WHERE status = 'active' LIMIT 1`
  - Resultado: `ERROR: no such column: status`
  - Codigo relacionado: `appointmentStockValidation.service.ts:65`

## 17. Arquivos envolvidos

- `app/src/lib/db/sqlite.ts`: auto-patches runtime.
- `app/src-tauri/src/lib.rs`: migrations Tauri registradas de 1 a 19.
- `app/src/lib/db/migrations/013_body_areas_clinical_nomenclature.sql`: cria `technical_name` e `canonical_slug`, mas banco real nao aplicou.
- `app/src/lib/db/migrations/016_procedure_corrections.sql`: cria colunas de correcao em `procedures`, mas banco real nao aplicou.
- `app/src/features/procedures/repositories/procedures.repository.ts`: consultas e inserts dependem de colunas ausentes.
- `app/src/features/procedures/services/procedureCorrection.service.ts`: fluxo de correcao depende de schema ausente.
- `app/src/features/agenda/services/appointmentStockValidation.service.ts`: query usa `inventory_batches.status`.
- `app/src/features/agenda/services/appointments.service.ts`: update nao busca appointment por ID.
- `app/src/features/patients/services/patientApplications.service.ts`: cria appointment antes de plan e nao preenche link reverso.
- `app/src/features/inventory/services/inventoryReceipt.service.ts`: XML com workaround e risco de batch vazio.
- `app/src/features/inventory/repositories/stockMovement.repository.ts`: nao grava `location_id`.
- `app/src/features/labels/services/labels.service.ts`: gera QR payload.

## 18. Correcoes recomendadas e ordem ideal

FASE 1 - Build/typecheck e estabilidade imediata

- Estado final ja passa em `tsc` e `build`.
- Preservar esse gate como obrigatorio apos qualquer correcao.

FASE 2 - Banco, migrations e queries quebradas

- Criar migration/patch idempotente para bancos reais em `1..12`, cobrindo:
  - `procedures.is_corrected`
  - `procedures.corrected_at`
  - `procedures.correction_reason`
  - `procedure_items_used.corrected_at`, se confirmado como campo necessario
- Corrigir `appointmentStockValidation.service.ts` para nao depender de `inventory_batches.status`.
- Reduzir/remover auto-patches de `sqlite.ts` apos formalizar migrations.

FASE 3 - Estoque -> aplicacao -> prontuario

- Corrigir `procedures.repository.createItem` e `procedureCorrection.service`.
- Validar finalizar aplicacao em copia do banco real: item com lote, baixa do lote, baixa do estoque geral, movimento, evolucao e prontuario.
- Garantir que item que exige lote nunca gere movimento sem `inventory_batch_id`.

FASE 4 - Agenda, reservas e protocolos

- Corrigir vinculo reverso `appointments.application_plan_id`.
- Criar `appointmentsRepository.findById` e usar no update.
- Validar reserva usando protocolos com itens reais, considerando agendamentos ativos.

FASE 5 - Relatorios, etiquetas e QR Code

- Criar leitura/consulta de QR `CESTQ:BATCH:{batchId}` para abrir lote correto.
- Revisar relatorios de compra para incluir reservado, minimo, custo e localizacao.
- Garantir que relatorios mostrem avisos quando dados estao vazios por soft delete.

FASE 6 - UX/UI, onboarding e refinamentos

- Substituir alerts/confirms soltos por modais padronizados.
- Mostrar estado de integracao incompleta quando flags estao ativas sem URL/chave.
- Revisar texto/acentuacao corrompida.

## 19. Riscos se nao corrigir

- Aplicacoes podem falhar na finalizacao/correcao em producao mesmo com build aprovado.
- Reservas de estoque podem nao ser calculadas, permitindo agenda acima do saldo disponivel.
- Movimentos sem lote comprometem rastreabilidade clinica e financeira.
- Instancias diferentes podem ter schemas diferentes por causa de auto-patch runtime.
- QR Code pode ser impresso sem haver fluxo operacional para abrir o lote.
- Restore de backup pode reintroduzir schema antigo sem validacao.

## 20. Resultado do typecheck

Comando final executado em `app`:

```powershell
npm.cmd exec tsc -- --noEmit
```

Resultado final: passou sem erros.

Observacao: durante a auditoria houve mudancas no arquivo de importacao XML; resultados acima consideram o estado final do workspace apos essas mudancas.

## 21. Resultado do build

Comando final executado em `app`:

```powershell
npm.cmd run build
```

Resultado final: passou. O Vite gerou `dist` com sucesso em aproximadamente 26 segundos na ultima execucao.

## 22. Atualizacao pos-correcao - 2026-06-12

Apos a auditoria, foram aplicadas correcoes nos pontos classificados como mais urgentes, sem apagar dados, sem recriar banco, sem criar mocks e sem executar escrita manual contra o banco real instalado.

Correcoes aplicadas:

- `app/src/lib/db/sqlite.ts`: ampliado o patch runtime idempotente para compatibilidade com bancos locais atrasados, cobrindo colunas de itens, fornecedores, areas corporais, procedimentos, itens usados em procedimentos, localizacao de estoque e backfill seguro do local padrao.
- `app/src/features/agenda/services/appointmentStockValidation.service.ts`: removida dependencia da coluna inexistente `inventory_batches.status`; a validacao passa a usar `deleted_at IS NULL`.
- `app/src/features/agenda/repositories/appointments.repository.ts`: adicionado `findById` e ajuste de update para preservar `notes` quando o campo nao e enviado.
- `app/src/features/agenda/services/appointments.service.ts`: sincronizado vinculo reverso entre agenda e plano de aplicacao em criacao, atualizacao e cancelamento.
- `app/src/features/patients/services/patientApplications.service.ts`: reorganizado fluxo de criacao/edicao/cancelamento para criar o plano antes do agendamento e manter `appointment_id`/`application_plan_id` consistentes.
- `app/src/features/inventory/repositories/stockMovement.repository.ts`: movimentos passam a aceitar e gravar `location_id`.
- `app/src/features/inventory/services/inventoryReceipt.service.ts`: entradas manuais e XML passam a atualizar estoque por local padrao e gerar movimento com lote/local quando disponivel.
- `app/src/features/inventory/repositories/locations.repository.ts`: adicionadas consultas para localizar local padrao e local com saldo suficiente.
- `app/src/features/procedures/services/procedures.service.ts`: finalizacao de procedimento agora baixa lote, estoque geral, estoque por local e movimento de estoque no mesmo fluxo.
- `app/src/features/procedures/services/procedureCorrection.service.ts`: correcao de procedimento agora calcula deltas, repoe/baixa estoque, grava movimentos e marca itens anteriores como corrigidos.
- `app/src/app/router.tsx`, `app/src/features/labels/repositories/labels.repository.ts`, `app/src/features/labels/services/labels.service.ts` e `app/src/features/labels/pages/LabelsPage.tsx`: adicionada resolucao de QR/lote para payload `CESTQ:BATCH:{id}` ou id bruto.

Validacoes executadas apos as correcoes:

```powershell
npm.cmd exec tsc -- --noEmit
```

Resultado: passou sem erros.

```powershell
npm.cmd run build
```

Resultado: passou. O Vite gerou `dist` com sucesso (`3697 modules transformed`, `built in 16.61s`).

Observacao: as correcoes de schema foram implementadas como compatibilidade idempotente no startup Tauri, preservando o banco real e evitando qualquer recriacao. A formalizacao posterior em migrations versionadas continua recomendada para eliminar dependencia permanente de auto-patches em runtime.
