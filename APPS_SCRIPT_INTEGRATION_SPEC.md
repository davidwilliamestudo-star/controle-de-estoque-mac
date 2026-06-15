# Integração Apps Script — Controle de Estoque Dra. Ana Morong

## 1. Objetivo

Este documento especifica a integração futura entre o sistema desktop local **Controle de Estoque — Dra. Ana Morong** e um **Google Apps Script** atuando como API externa auxiliar.

O sistema atual deve continuar sendo local-first:

- Tauri como runtime desktop.
- React + TypeScript como frontend.
- SQLite local como fonte principal de verdade.
- Services e repositories locais como camada correta de regra de negócio e persistência.

O Apps Script não deve substituir o banco local. Ele deve ser usado apenas para tarefas auxiliares que dependem do ecossistema Google:

- Criar eventos no Google Calendar da clínica.
- Enviar e-mail personalizado ao paciente.
- Gerar link para o paciente adicionar o evento à própria agenda.
- Agendar check-in automático 3 dias após a aplicação.
- Enviar formulário de check-in pós-aplicação.
- Armazenar e disponibilizar respostas de check-in.
- Retornar status, IDs externos e erros para o sistema local.

Esta especificação não implementa a integração. Ela prepara a próxima etapa, na qual o código Apps Script e o service local serão gerados.

Restrições obrigatórias:

- Não enviar fotos de paciente.
- Não enviar dados clínicos sensíveis desnecessários.
- Não enviar evolução clínica, intercorrências, itens utilizados, lotes ou observações internas para o Google, salvo quando houver necessidade operacional explícita e consentida.
- Aplicar o princípio de mínimo dado necessário.
- Manter o SQLite local como registro principal e auditável.

## 2. Visão geral da arquitetura

Arquitetura atual:

```text
React UI
  -> Service local
    -> Repository local
      -> SQLite local
```

Arquitetura futura sugerida para integrações externas:

```text
React UI
  -> Service local
    -> Repository local
      -> SQLite local
    -> AppScriptIntegrationService
      -> external_sync_queue
      -> HTTP POST Apps Script Web App
        -> Google Calendar
        -> Gmail / MailApp
        -> Google Forms / Sheets
```

Regra importante: componentes React nunca devem chamar o Apps Script diretamente. O ponto correto é sempre um service local.

Fluxo futuro recomendado:

1. UI coleta a intenção do usuário.
2. Service local valida regras mínimas.
3. Repository local cria/atualiza registros no SQLite.
4. Service local registra auditoria.
5. `AppScriptIntegrationService` monta payload mínimo.
6. A requisição vai para fila local ou é enviada imediatamente.
7. Retorno do Apps Script atualiza status local.
8. Falhas ficam pendentes para retentativa.

O projeto já possui um ponto candidato para substituição futura:

- `app/src/features/agenda/services/calendarSync.service.ts`

Estado atual desse service: é um stub/no-op. Ele apenas registra no console e não faz HTTP real.

## 3. Fluxo de agendamento

Fluxo esperado para agendar uma aplicação:

1. Usuário cria uma aplicação planejada para um paciente.
2. Usuário vincula data e hora à aplicação.
3. O sistema valida que o paciente existe.
4. O sistema valida que o paciente possui e-mail cadastrado antes de habilitar a integração externa.
5. Se o paciente não tiver e-mail, a integração deve ser bloqueada e a UI deve mostrar aviso claro.
6. O sistema cria/atualiza o registro local no SQLite.
7. O sistema cria/atualiza o registro de appointment local.
8. O sistema cria uma entrada de fila/sync local com `request_id`.
9. O sistema envia `POST` para o Apps Script, se houver internet e integração ativa.
10. O Apps Script valida autenticação.
11. O Apps Script valida payload.
12. O Apps Script cria ou atualiza evento no Google Calendar.
13. O Apps Script envia um e-mail HTML personalizado ao paciente.
14. O Apps Script agenda check-in para 3 dias após a aplicação.
15. O Apps Script retorna IDs, URLs e status.
16. O sistema local salva o retorno.
17. O sistema local registra auditoria.
18. O sistema local mostra status de sincronização.

Fonte local atual para criação de aplicação planejada:

- `app/src/features/patients/services/patientApplications.service.ts`
- `app/src/features/patients/repositories/patientApplications.repository.ts`
- Tabela futura/atual registrada: `patient_application_plans`

Fonte local atual para appointment:

- `app/src/features/agenda/services/appointments.service.ts`
- `app/src/features/agenda/repositories/appointments.repository.ts`
- Tabela: `appointments`

Ponto de atenção técnico:

Há uma inconsistência de schema em `appointments`. A migration inicial `001_initial.sql` cria `appointments` com campos como `appointment_type`, `scheduled_at`, `google_calendar_event_id`. A migration `005_appointments.sql` tenta criar outra versão com `type`, `appointment_date`, `google_event_id`. Como ela usa `CREATE TABLE IF NOT EXISTS`, bancos criados a partir da migration 001 podem manter o primeiro formato. O repository atual de agenda usa o formato da migration 005.

Antes de implementar Apps Script, é necessário reconciliar essa tabela em uma migration corretiva.

## 4. Fluxo de e-mail ao paciente

Objetivo do e-mail de agendamento:

- Confirmar a aplicação agendada.
- Entregar informações operacionais úteis.
- Permitir que o paciente adicione o evento à agenda.
- Evitar exposição clínica desnecessária.

O e-mail de agendamento deve conter:

- Nome do paciente.
- Data da aplicação.
- Horário.
- Via da aplicação.
- Protocolo, se aplicável.
- Duração estimada.
- Orientações gerais, sem condutas clínicas específicas.
- Botão/link “Adicionar à minha agenda”.
- Informações da clínica.
- Aviso de que o e-mail é automático.

O sistema deve enviar apenas um e-mail personalizado principal ao paciente. Ao adicionar o paciente como convidado no Calendar, o Google pode enviar convite automático. A implementação futura deve avaliar tecnicamente se isso cria comunicação duplicada. Se houver duplicidade, preferir:

- Criar evento no calendário da clínica sem convidado e gerar link `.ics`/calendar-link no e-mail; ou
- Adicionar convidado, mas desativar notificações automáticas se a API usada permitir; ou
- Aceitar o convite automático apenas se for necessário para o botão de agenda.

Dados que não devem ir no e-mail:

- Evolução clínica.
- Intercorrências.
- Alertas internos do paciente.
- Itens utilizados.
- Lotes.
- Custos.
- Observações internas.
- Histórico de aplicações.

## 5. Fluxo de Google Calendar

O Apps Script deve criar evento no calendário da clínica.

Dados mínimos do evento:

- Título.
- Data/hora de início.
- Data/hora de fim.
- Descrição com dados operacionais mínimos.
- Link do evento retornado ao sistema local.
- ID do evento retornado ao sistema local.

Título sugerido:

```text
Aplicação — {{patient_name}} — {{route_code}}
```

Descrição sugerida:

```text
Aplicação agendada pelo sistema Controle de Estoque — Dra. Ana Morong.

Paciente: {{patient_name}}
Via: {{route_name}}
Protocolo: {{protocol_name}}
ID interno da aplicação: {{application_plan_id}}
ID interno do agendamento: {{appointment_id}}

Observação: evento criado automaticamente por integração local.
```

Dados opcionais:

- `notes` apenas se for uma observação administrativa não sensível.
- `protocol_name` apenas se a clínica considerar adequado expor esse nome ao Google e ao paciente.

Dados a evitar:

- Evolução.
- Intercorrências.
- Medicamentos específicos utilizados.
- Materiais.
- Lotes.
- Alertas clínicos.

Campos locais existentes parcialmente relacionados:

- `appointments.google_calendar_event_id` na migration 001.
- `appointments.google_event_id` na migration 005 e repository atual.
- `appointments.sync_status`.

Campos faltantes recomendados:

- URL pública ou editável do evento.
- Última tentativa de sync.
- Último erro.
- ID/request de idempotência.

## 6. Fluxo de check-in pós-aplicação

Objetivo:

Enviar um check-in simples 3 dias após a aplicação, para que a clínica saiba se o paciente relata desconforto, intercorrência ou deseja contato.

Fluxo esperado:

1. Ao agendar ou finalizar uma aplicação, o sistema calcula `scheduled_for = application_date + 3 dias`.
2. O sistema local registra intenção de check-in.
3. O Apps Script também registra a tarefa, ou recebe uma fila/tabela própria para isso.
4. Um trigger de tempo no Apps Script roda periodicamente.
5. O trigger encontra check-ins pendentes.
6. O Apps Script envia e-mail com link do formulário.
7. O Apps Script marca o check-in como enviado.
8. O paciente responde ao formulário.
9. As respostas ficam armazenadas em Google Sheets ou storage controlado pelo Apps Script.
10. O sistema local consulta respostas ou recebe status futuramente.
11. O sistema local marca resposta como sincronizada.

Perguntas do formulário:

- Como você está se sentindo?
- Teve alguma intercorrência?
- Teve dor, vermelhidão, inchaço ou desconforto?
- Teve algum sintoma inesperado?
- Deseja que a equipe entre em contato?
- Observações livres.

Texto obrigatório de segurança no formulário:

```text
Este check-in não substitui atendimento médico. Em caso de sintomas importantes, piora do estado geral ou urgência, procure atendimento adequado ou entre em contato com a equipe pelos canais oficiais.
```

O check-in não deve orientar condutas clínicas dentro do sistema.

Estado atual:

- Não existe tabela local dedicada a check-in.
- Não existe service local de check-in.
- Não existe Apps Script.
- Não existe envio real de formulário.

## 7. Dados disponíveis no sistema atual

### Pacientes

Tabela: `patients`

Campos relevantes:

- `id`
- `clinic_id`
- `full_name`
- `phone`
- `email`
- `birth_date`
- `notes`
- `alert_notes`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/patients/services/patients.service.ts`
- `app/src/features/patients/repositories/patients.repository.ts`
- `app/src/features/patients/schemas/patient.schema.ts`

Relacionamentos:

- `procedures.patient_id -> patients.id`
- `appointments.patient_id -> patients.id`
- `patient_application_plans.patient_id -> patients.id`

Observações:

- `email` existe, mas é opcional no schema Zod.
- Para integração Apps Script, e-mail deve ser obrigatório apenas no fluxo de sincronização externa, não necessariamente no cadastro geral.
- `notes` e `alert_notes` não devem ser enviados para o Apps Script.
- `phone` existe, mas não é necessário para o payload mínimo.

### E-mail do paciente

Tabela: `patients`

Campo: `email`

Estado atual:

- Campo existe.
- Validação aceita e-mail vazio.
- Não há constraint `NOT NULL`.

Necessidade futura:

- Validar no service antes de chamar Apps Script.
- Bloquear integração externa se estiver vazio.
- Não tornar obrigatório globalmente sem decisão de produto.

### Telefone do paciente

Tabela: `patients`

Campo: `phone`

Estado atual:

- Existe.
- Opcional.
- Não é necessário para Calendar/e-mail.

Recomendação:

- Não enviar ao Apps Script no payload padrão.
- Enviar apenas se houver futura integração de WhatsApp/SMS e base legal/consentimento.

### Aplicações planejadas

Tabela: `patient_application_plans`

Campos:

- `id`
- `clinic_id`
- `patient_id`
- `protocol_id`
- `route_id`
- `appointment_id`
- `scheduled_at`
- `status`
- `notes`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/patients/services/patientApplications.service.ts`
- `app/src/features/patients/repositories/patientApplications.repository.ts`
- `app/src/features/patients/types/patientApplicationPlan.ts`

Relacionamentos:

- `patient_id -> patients.id`
- `protocol_id -> protocols.id`
- `route_id -> administration_routes.id`
- `appointment_id -> appointments.id`

Observações:

- A tabela foi registrada na migration `008_patient_application_plans.sql`.
- `scheduled_at` existe.
- `appointment_id` permite vincular ao agendamento.
- `notes` pode conter dados sensíveis; não enviar por padrão.

### Aplicações agendadas / appointments

Tabela: `appointments`

Campos esperados pelo repository atual:

- `id`
- `clinic_id`
- `patient_id`
- `type`
- `appointment_date`
- `duration_minutes`
- `status`
- `notes`
- `sync_status`
- `google_event_id`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/agenda/services/appointments.service.ts`
- `app/src/features/agenda/repositories/appointments.repository.ts`
- `app/src/features/agenda/schemas/appointment.schema.ts`

Campos definidos na migration inicial alternativa:

- `appointment_type`
- `scheduled_at`
- `patient_email_snapshot`
- `google_calendar_event_id`
- `last_sync_attempt_at`
- `sync_error`
- `created_by_user_id`

Observações críticas:

- Existe divergência entre schema inicial e repository atual.
- Antes de integrar, criar migration corretiva para padronizar nomes e preservar dados.
- O status atual aceita `scheduled`, `confirmed`, `done`, `missed`, `canceled` no schema de agenda; em outras tabelas o padrão usa `cancelled`.

### Procedimentos finalizados

Tabela: `procedures`

Campos:

- `id`
- `clinic_id`
- `patient_id`
- `protocol_id`
- `appointment_id`
- `application_plan_id`
- `body_area_id`
- `performed_at`
- `status`
- `had_intercurrence`
- `intercurrence_description`
- `notes`
- `evolution_text`
- `responsible_user_id`
- `finalized_at`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/procedures/services/procedures.service.ts`
- `app/src/features/procedures/repositories/procedures.repository.ts`
- `app/src/features/procedures/types/index.ts`

Relacionamentos:

- `patient_id -> patients.id`
- `protocol_id -> protocols.id`
- `appointment_id -> appointments.id`
- `application_plan_id -> patient_application_plans.id`
- `body_area_id -> body_areas.id`

Observações:

- Check-in pode ser vinculado ao procedimento quando a aplicação é finalizada.
- `evolution_text`, `intercurrence_description` e `notes` não devem ser enviados para o Google por padrão.
- `had_intercurrence` pode ser usado localmente para priorizar contato, mas não precisa ser enviado para Calendar/e-mail.

### Protocolos

Tabela: `protocols`

Campos:

- `id`
- `clinic_id`
- `name`
- `category_id`
- `administration_route_id`
- `description`
- `internal_notes`
- `default_evolution_template_id`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/protocols/services/protocols.service.ts`
- `app/src/features/protocols/repositories/protocols.repository.ts`
- `app/src/features/protocols/types/index.ts`

Relacionamentos:

- `administration_route_id -> administration_routes.id`
- `protocol_items.protocol_id -> protocols.id`
- `procedures.protocol_id -> protocols.id`
- `patient_application_plans.protocol_id -> protocols.id`

Observações:

- `name` pode ir no e-mail se a clínica considerar adequado.
- `description` e `internal_notes` não devem ser enviados.

### Vias de aplicação

Tabela: `administration_routes`

Campos:

- `id`
- `clinic_id`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `proceduresRepository.listAdministrationRoutes()`
- `inventoryRepository.listAdministrationRoutes()`

Observações:

- A seed contém nomes como EV, IM, SC em uma migration, e nomes longos como Endovenosa, Intramuscular, Subcutânea em outra.
- O payload precisa de `route_code` e `route_name`; hoje só existe `name`.
- Migration futura pode adicionar `code` a `administration_routes`, ou o service pode mapear códigos por ID/nome.

### Áreas corporais

Tabela: `body_areas`

Campos:

- `id`
- `clinic_id`
- `name`
- `slug`
- `svg_region_id`
- `description`
- `is_active`
- `created_at`
- `updated_at`

Relacionamentos:

- `procedures.body_area_id -> body_areas.id`
- `route_body_areas.body_area_id -> body_areas.id`

Observações:

- Área corporal não é necessária para Calendar/e-mail mínimo.
- Enviar área corporal ao Google pode aumentar exposição de dados; evitar por padrão.

### Itens utilizados

Tabela: `procedure_items_used`

Campos:

- `id`
- `clinic_id`
- `procedure_id`
- `inventory_item_id`
- `inventory_batch_id`
- `item_type`
- `quantity_used`
- `unit`
- `batch_number_snapshot`
- `expiration_date_snapshot`
- `notes`
- `created_at`

Relacionamentos:

- `procedure_id -> procedures.id`
- `inventory_item_id -> inventory_items.id`
- `inventory_batch_id -> inventory_batches.id`

Observações:

- Não enviar ao Apps Script para agenda/e-mail/check-in.
- Manter local por LGPD e mínimo dado necessário.

### Audit logs

Tabela: `audit_logs`

Campos:

- `id`
- `clinic_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `description`
- `before_data`
- `after_data`
- `device_info`
- `hash_previous`
- `hash_current`
- `created_at`

Repository:

- `app/src/features/audit/repositories/audit.repository.ts`

Observações:

- Deve registrar eventos de integração.
- Não enviar logs para o Apps Script por padrão.

### Settings

Tabela: `settings`

Campos:

- `id`
- `clinic_id`
- `key`
- `value`
- `created_at`
- `updated_at`

Seed atual relevante:

- `clinic_name`
- `professional_name`
- `google_calendar_sync_enabled = false`
- `lock_after_minutes`

Observações:

- Settings é o local natural para URL do Apps Script, status de integração e preferências.
- Segredo/API key não deve ficar hardcoded no frontend.
- Se armazenar localmente no SQLite, considerar ofuscação/criptografia ou storage seguro Tauri em fase futura.

### Notifications

Tabela: `notifications`

Campos:

- `id`
- `clinic_id`
- `user_id`
- `type`
- `title`
- `message`
- `entity_type`
- `entity_id`
- `severity`
- `status`
- `action_url`
- `metadata_json`
- `read_at`
- `created_at`
- `updated_at`
- `deleted_at`

Services/repositories:

- `app/src/features/notifications/services/notifications.service.ts`
- `app/src/features/notifications/repositories/notifications.repository.ts`

Observações:

- Pode exibir falhas de integração, filas pendentes e check-ins com resposta crítica.
- Não deve receber payload clínico sensível no `metadata_json`.

## 8. Campos/tabelas faltantes

Faltam estruturas locais para uma integração robusta:

- Tabela de logs externos (`external_sync_logs`).
- Fila local de sincronização (`external_sync_queue`).
- Tabela de check-ins (`checkin_requests`).
- Tabela de templates de e-mail (`email_templates`), se templates forem editáveis localmente.
- Campos padronizados em `appointments` para Apps Script.
- Campo `google_calendar_event_url`.
- Campo `appscript_sync_status`.
- Campo `appscript_last_error`.
- Campo `appscript_last_sync_at`.
- Campo `appscript_request_id`.
- Configurações locais para:
  - URL do Apps Script.
  - API key.
  - calendar ID.
  - e-mail remetente/resposta.
  - ativar/desativar envio de e-mail.
  - ativar/desativar Calendar.
  - ativar/desativar check-in.

Também falta padronização entre:

- `google_event_id` e `google_calendar_event_id`.
- `appointment_date` e `scheduled_at`.
- `type` e `appointment_type`.
- `canceled` e `cancelled`.

## 9. Contratos de payload JSON

Endpoint sugerido:

```text
POST /exec
```

Como Apps Script Web App geralmente expõe uma URL única, a ação deve ir no payload.

### 9.1 Payload mínimo: create_application_appointment

```json
{
  "action": "create_application_appointment",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "application_plan_id": "uuid",
  "appointment_id": "uuid",
  "patient": {
    "id": "uuid",
    "name": "Nome do paciente",
    "email": "paciente@email.com"
  },
  "application": {
    "protocol_id": "uuid",
    "protocol_name": "Nome do protocolo",
    "route_id": "uuid",
    "route_code": "EV",
    "route_name": "Endovenosa",
    "scheduled_at": "2026-06-11T09:00:00-03:00",
    "duration_minutes": 60,
    "notes": ""
  },
  "clinic": {
    "name": "Dra. Ana Morong",
    "email": "",
    "phone": "",
    "address": ""
  }
}
```

Campos obrigatórios:

- `action`
- `request_id`
- `clinic_id`
- `application_plan_id`
- `patient.id`
- `patient.name`
- `patient.email`
- `application.route_code`
- `application.scheduled_at`

Campos recomendados:

- `appointment_id`
- `application.protocol_id`
- `application.protocol_name`
- `application.route_id`
- `application.route_name`
- `application.duration_minutes`
- `clinic.name`

Campos opcionais e sensíveis:

- `application.notes`: enviar apenas se for administrativo e não clínico.

Campos proibidos neste payload:

- `patient.notes`
- `patient.alert_notes`
- `procedure.evolution_text`
- `procedure.intercurrence_description`
- `procedure_items_used`
- Dados de lotes.
- Custos.
- Fotos.

### 9.2 Payload: update_application_appointment

```json
{
  "action": "update_application_appointment",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "application_plan_id": "uuid",
  "appointment_id": "uuid",
  "calendar_event_id": "google_calendar_event_id",
  "patient": {
    "id": "uuid",
    "name": "Nome do paciente",
    "email": "paciente@email.com"
  },
  "application": {
    "route_code": "EV",
    "route_name": "Endovenosa",
    "protocol_name": "Nome do protocolo",
    "scheduled_at": "2026-06-11T10:00:00-03:00",
    "duration_minutes": 60
  },
  "notify_patient": true
}
```

Obrigatórios:

- `action`
- `request_id`
- `clinic_id`
- `application_plan_id`
- `appointment_id`
- `calendar_event_id`
- `patient.email`
- `application.scheduled_at`

### 9.3 Payload: cancel_application_appointment

```json
{
  "action": "cancel_application_appointment",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "application_plan_id": "uuid",
  "appointment_id": "uuid",
  "calendar_event_id": "google_calendar_event_id",
  "patient": {
    "id": "uuid",
    "name": "Nome do paciente",
    "email": "paciente@email.com"
  },
  "reason": "Cancelado pela clínica",
  "notify_patient": false
}
```

### 9.4 Payload: send_checkin_form

```json
{
  "action": "send_checkin_form",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "checkin_request_id": "uuid",
  "application_plan_id": "uuid",
  "procedure_id": "uuid",
  "appointment_id": "uuid",
  "patient": {
    "id": "uuid",
    "name": "Nome do paciente",
    "email": "paciente@email.com"
  },
  "application": {
    "performed_or_scheduled_at": "2026-06-11T09:00:00-03:00",
    "route_name": "Endovenosa"
  }
}
```

### 9.5 Payload: get_checkin_responses

```json
{
  "action": "get_checkin_responses",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "filters": {
    "patient_id": "uuid",
    "application_plan_id": "uuid",
    "procedure_id": "uuid",
    "from": "2026-06-01",
    "to": "2026-06-30",
    "only_unsynced": true
  }
}
```

### 9.6 Payload: mark_checkin_synced

```json
{
  "action": "mark_checkin_synced",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "response_ids": ["google-response-id-1", "google-response-id-2"]
}
```

### 9.7 Payload: health_check

```json
{
  "action": "health_check",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic"
}
```

### 9.8 Payload: send_test_email

```json
{
  "action": "send_test_email",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "to": "teste@email.com",
  "template_key": "application_appointment",
  "sample_data": {
    "patient_name": "Paciente Teste",
    "scheduled_date": "11/06/2026",
    "scheduled_time": "09:00",
    "route_name": "Endovenosa",
    "clinic_name": "Dra. Ana Morong"
  }
}
```

### 9.9 Payload: get_calendar_event

```json
{
  "action": "get_calendar_event",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic",
  "calendar_event_id": "google_calendar_event_id"
}
```

## 10. Respostas esperadas do Apps Script

### 10.1 Resposta de sucesso para criação

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "create_application_appointment",
  "timestamp": "2026-06-10T15:30:00-03:00",
  "calendar": {
    "event_id": "google_calendar_event_id",
    "event_url": "https://calendar.google.com/...",
    "created": true
  },
  "email": {
    "sent": true,
    "to": "paciente@email.com",
    "sent_at": "2026-06-10T15:30:00-03:00"
  },
  "checkin": {
    "scheduled": true,
    "scheduled_for": "2026-06-14T09:00:00-03:00"
  }
}
```

### 10.2 Resposta de erro

```json
{
  "ok": false,
  "request_id": "uuid",
  "action": "create_application_appointment",
  "timestamp": "2026-06-10T15:30:00-03:00",
  "error_code": "PATIENT_EMAIL_REQUIRED",
  "message": "Paciente sem e-mail cadastrado."
}
```

### 10.3 Códigos de erro sugeridos

- `UNAUTHORIZED`
- `INVALID_ACTION`
- `INVALID_PAYLOAD`
- `PATIENT_EMAIL_REQUIRED`
- `CALENDAR_EVENT_NOT_FOUND`
- `CALENDAR_CREATE_FAILED`
- `CALENDAR_UPDATE_FAILED`
- `CALENDAR_CANCEL_FAILED`
- `EMAIL_SEND_FAILED`
- `CHECKIN_SCHEDULE_FAILED`
- `CHECKIN_RESPONSE_NOT_FOUND`
- `DUPLICATE_REQUEST`
- `INTERNAL_ERROR`

Os erros não devem retornar stack trace, token, payload completo, dados clínicos ou informações sensíveis.

## 11. Ações/endpoints necessários

### 11.1 `health_check`

Objetivo: verificar se a API está online e autenticada.

Payload:

```json
{
  "action": "health_check",
  "request_id": "uuid",
  "clinic_id": "ana-morong-clinic"
}
```

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "health_check",
  "service": "apps_script",
  "version": "1.0.0",
  "timestamp": "2026-06-10T15:30:00-03:00"
}
```

### 11.2 `create_application_appointment`

Objetivo:

- Criar evento no Calendar.
- Enviar e-mail ao paciente.
- Agendar check-in.

Resposta deve conter:

- `calendar.event_id`
- `calendar.event_url`
- `email.sent`
- `email.sent_at`
- `checkin.scheduled`
- `checkin.scheduled_for`

### 11.3 `update_application_appointment`

Objetivo:

- Atualizar data/hora/duração do evento.
- Opcionalmente enviar e-mail de atualização.
- Atualizar check-in futuro, se aplicável.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "update_application_appointment",
  "calendar": {
    "event_id": "google_calendar_event_id",
    "event_url": "https://calendar.google.com/...",
    "updated": true
  },
  "email": {
    "sent": true,
    "to": "paciente@email.com",
    "sent_at": "2026-06-10T16:00:00-03:00"
  },
  "checkin": {
    "rescheduled": true,
    "scheduled_for": "2026-06-14T10:00:00-03:00"
  }
}
```

### 11.4 `cancel_application_appointment`

Objetivo:

- Cancelar/remover evento no Calendar.
- Opcionalmente enviar e-mail de cancelamento.
- Cancelar check-in pendente.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "cancel_application_appointment",
  "calendar": {
    "event_id": "google_calendar_event_id",
    "cancelled": true
  },
  "email": {
    "sent": false
  },
  "checkin": {
    "cancelled": true
  }
}
```

### 11.5 `send_checkin_form`

Objetivo:

- Enviar formulário de check-in ao paciente.
- Marcar envio no controle do Apps Script.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "send_checkin_form",
  "checkin": {
    "sent": true,
    "sent_at": "2026-06-14T09:00:00-03:00",
    "form_url": "https://..."
  },
  "email": {
    "sent": true,
    "to": "paciente@email.com"
  }
}
```

### 11.6 `get_checkin_responses`

Objetivo:

- Consultar respostas por paciente, aplicação, procedimento ou período.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "get_checkin_responses",
  "responses": [
    {
      "response_id": "google-response-id",
      "checkin_request_id": "uuid",
      "patient_id": "uuid",
      "application_plan_id": "uuid",
      "procedure_id": "uuid",
      "submitted_at": "2026-06-14T12:00:00-03:00",
      "feeling": "Bem",
      "had_intercurrence": false,
      "local_discomfort": "Leve",
      "unexpected_symptoms": false,
      "wants_contact": false,
      "notes": "",
      "synced": false
    }
  ]
}
```

Observação: respostas de check-in podem conter informação de saúde relatada pelo paciente. Ao trazer para o sistema local, armazenar apenas o necessário e tratar como dado sensível.

### 11.7 `mark_checkin_synced`

Objetivo:

- Marcar respostas como já sincronizadas com o sistema local.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "mark_checkin_synced",
  "updated_count": 2
}
```

### 11.8 `send_test_email`

Objetivo:

- Testar template e configuração de envio.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "send_test_email",
  "email": {
    "sent": true,
    "to": "teste@email.com",
    "sent_at": "2026-06-10T15:30:00-03:00"
  }
}
```

### 11.9 `get_calendar_event`

Objetivo:

- Consultar evento externo por ID.

Resposta:

```json
{
  "ok": true,
  "request_id": "uuid",
  "action": "get_calendar_event",
  "calendar": {
    "event_id": "google_calendar_event_id",
    "event_url": "https://calendar.google.com/...",
    "status": "confirmed",
    "start": "2026-06-11T09:00:00-03:00",
    "end": "2026-06-11T10:00:00-03:00"
  }
}
```

## 12. Segurança e autenticação

Modelo mínimo recomendado:

- O Apps Script Web App deve validar uma chave secreta.
- O sistema local deve enviar a chave em header `X-API-Key`.
- Alternativamente, enviar `api_key` no payload, mas header é preferível.

Header sugerido:

```text
X-API-Key: secret
```

Regras:

- O token não deve ficar hardcoded em componente React.
- O token não deve ser commitado.
- O token deve ficar em configuração local segura ou em ambiente Tauri.
- O Apps Script deve validar o token antes de qualquer ação.
- Requisições inválidas retornam `UNAUTHORIZED`.
- Nunca retornar dados sensíveis em erro.
- Não logar API key.
- Não logar payload completo com dados de paciente.
- Usar `request_id` para idempotência.

Idempotência:

- Cada requisição deve ter `request_id`.
- Apps Script deve manter log de `request_id` processado.
- Se receber o mesmo `request_id`, deve retornar a mesma resposta anterior quando possível.
- Isso evita duplicar evento/e-mail em retentativas.

Sugestão adicional:

- Adicionar `X-Clinic-ID`.
- Adicionar `X-Request-ID`.
- Assinar payload no futuro com HMAC se a integração crescer.

## 13. Templates de e-mail

### 13.1 E-mail de agendamento

Assunto sugerido:

```text
Confirmação da sua aplicação — {{clinic_name}}
```

Variáveis:

- `{{patient_name}}`
- `{{scheduled_date}}`
- `{{scheduled_time}}`
- `{{route_name}}`
- `{{protocol_name}}`
- `{{clinic_name}}`
- `{{calendar_link}}`
- `{{checkin_info}}`

Conteúdo esperado:

```html
<p>Olá, {{patient_name}}.</p>

<p>Sua aplicação foi agendada em {{clinic_name}}.</p>

<ul>
  <li>Data: {{scheduled_date}}</li>
  <li>Horário: {{scheduled_time}}</li>
  <li>Via: {{route_name}}</li>
  <li>Protocolo: {{protocol_name}}</li>
</ul>

<p>{{checkin_info}}</p>

<p>
  <a href="{{calendar_link}}">Adicionar à minha agenda</a>
</p>

<p>Este é um e-mail automático. Em caso de dúvida, entre em contato com a clínica pelos canais oficiais.</p>
```

Regras:

- Visual elegante e responsivo.
- Não incluir dados clínicos detalhados.
- Não incluir notas internas.
- Não incluir lotes/medicamentos/materiais.
- Não incluir histórico do paciente.

### 13.2 E-mail de check-in

Assunto sugerido:

```text
Check-in pós-aplicação — queremos saber como você está
```

Variáveis:

- `{{patient_name}}`
- `{{application_date}}`
- `{{clinic_name}}`
- `{{checkin_form_url}}`

Conteúdo esperado:

```html
<p>Olá, {{patient_name}}.</p>

<p>Estamos fazendo um check-in rápido após sua aplicação realizada/agendada em {{application_date}}.</p>

<p>Para responder, clique no botão abaixo:</p>

<p>
  <a href="{{checkin_form_url}}">Responder check-in</a>
</p>

<p>Suas respostas serão avaliadas pela equipe da {{clinic_name}}.</p>

<p>Este check-in não substitui atendimento médico. Em caso de sintomas importantes, procure atendimento adequado ou entre em contato com a equipe pelos canais oficiais.</p>
```

## 14. Google Calendar

Configurações necessárias no Apps Script:

- Calendar ID da clínica.
- Timezone: `America/Sao_Paulo`.
- Duração padrão, caso o payload não envie.
- Preferência de notificação/convidado.

Criação de evento:

- Início: `application.scheduled_at`.
- Fim: início + `duration_minutes`.
- Título: `Aplicação — {{patient_name}} — {{route_code}}`.
- Descrição: dados operacionais mínimos.
- Convidado: paciente por e-mail, se tecnicamente adequado.
- Lembretes: usar padrão do calendário ou lembrete configurado.

Retorno obrigatório:

- `event_id`
- `event_url`
- `created` ou `updated`

Cuidados:

- Avaliar se adicionar convidado dispara e-mail automático do Google.
- Evitar dois e-mails conflitantes.
- Evitar exposição de protocolo se for considerado sensível.
- Não incluir conteúdo clínico detalhado na descrição.

## 15. Check-in form

Opções futuras:

1. Google Forms + Google Sheets.
2. HTML form servido pelo Apps Script Web App.

Google Forms + Sheets:

- Mais simples.
- Fácil armazenamento.
- Menos controle visual.
- Pode exigir mapeamento de respostas por colunas.

HTML form via Apps Script:

- Mais controle visual.
- Pode usar URL com tokens.
- Exige código adicional para validação e gravação.

Campos sugeridos:

1. ID da aplicação, oculto ou pré-preenchido.
2. ID do check-in, oculto.
3. Nome do paciente.
4. E-mail.
5. Como você está se sentindo?
6. Teve alguma intercorrência?
7. Teve dor, vermelhidão, inchaço ou desconforto?
8. Teve algum sintoma inesperado?
9. Deseja contato da equipe?
10. Observações.

Tipos de campo:

- Múltipla escolha.
- Escala simples.
- Sim/não.
- Texto longo para observações.

Dados a armazenar:

- `response_id`
- `checkin_request_id`
- `application_plan_id`
- `procedure_id`
- `appointment_id`
- `patient_id`
- `patient_email`
- `submitted_at`
- respostas objetivas
- observações
- `synced`

## 16. Triggers e automações

Trigger Apps Script:

- Tipo: time-driven.
- Frequência sugerida: a cada 1 hora ou diariamente pela manhã.
- Responsabilidade: processar check-ins pendentes.

Rotina:

1. Ler tabela/planilha de check-ins pendentes.
2. Filtrar `scheduled_for <= now`.
3. Ignorar itens já enviados.
4. Enviar e-mail de check-in.
5. Salvar `sent_at`.
6. Salvar `status = sent`.
7. Registrar erro se falhar.
8. Não duplicar envio.

Status sugeridos para check-in:

- `scheduled`
- `sent`
- `answered`
- `synced`
- `cancelled`
- `failed`

## 17. Fila de sincronização e retentativas

Como o app é local/offline, a integração deve tolerar internet ausente.

Regras:

- Nunca impedir o uso local se Apps Script estiver fora.
- Criar/atualizar dados locais primeiro.
- Salvar pendência local.
- Marcar status como `pending`.
- Tentar envio em background.
- Em falha, registrar erro e manter na fila.
- Exibir notificação no sistema.
- Permitir reenvio manual.
- Usar backoff simples para retentativas.

Tabela sugerida: `external_sync_queue`

Campos:

- `id`
- `clinic_id`
- `provider`
- `action`
- `entity_type`
- `entity_id`
- `request_id`
- `payload_json`
- `status`
- `attempts`
- `last_attempt_at`
- `next_attempt_at`
- `last_error`
- `created_at`
- `updated_at`

Status sugeridos:

- `pending`
- `processing`
- `synced`
- `failed`
- `cancelled`

Retentativa:

- 1ª tentativa imediata.
- 2ª tentativa após 5 minutos.
- 3ª tentativa após 30 minutos.
- Próximas tentativas manuais ou diárias.

## 18. Logs e auditoria

Eventos que devem gerar `audit_logs`:

- `appscript_health_check_success`
- `appscript_health_check_failed`
- `appscript_appointment_sync_queued`
- `appscript_appointment_create_sent`
- `appscript_appointment_create_success`
- `appscript_appointment_create_failed`
- `appscript_appointment_update_sent`
- `appscript_appointment_update_success`
- `appscript_appointment_update_failed`
- `appscript_appointment_cancel_sent`
- `appscript_appointment_cancel_success`
- `appscript_appointment_cancel_failed`
- `appscript_calendar_event_created`
- `appscript_calendar_event_updated`
- `appscript_calendar_event_cancelled`
- `appscript_email_sent`
- `appscript_email_failed`
- `appscript_checkin_scheduled`
- `appscript_checkin_sent`
- `appscript_checkin_response_received`
- `appscript_checkin_response_synced`
- `appscript_manual_retry`

Não registrar payload completo com dados sensíveis em `audit_logs`.

Para auditoria local, preferir:

- action.
- entity_type.
- entity_id.
- request_id.
- status.
- mensagem curta.
- erro resumido.

## 19. Migrations futuras sugeridas

### 19.1 Corrigir/padronizar `appointments`

Objetivo:

- Resolver divergência entre migration 001 e 005.
- Padronizar campos usados por agenda e integração.

Campos sugeridos finais:

- `id`
- `clinic_id`
- `patient_id`
- `appointment_type`
- `scheduled_at`
- `duration_minutes`
- `status`
- `notes`
- `patient_email_snapshot`
- `google_calendar_event_id`
- `google_calendar_event_url`
- `appscript_sync_status`
- `appscript_request_id`
- `appscript_last_error`
- `appscript_last_sync_at`
- `email_sent_at`
- `checkin_scheduled_for`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

Observação:

Essa migration deve migrar dados de `type` para `appointment_type`, de `appointment_date` para `scheduled_at`, e de `google_event_id` para `google_calendar_event_id`, quando existirem.

### 19.2 `external_sync_logs`

```sql
CREATE TABLE IF NOT EXISTS external_sync_logs (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  request_id TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json TEXT,
  response_json TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 19.3 `external_sync_queue`

```sql
CREATE TABLE IF NOT EXISTS external_sync_queue (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 19.4 `checkin_requests`

```sql
CREATE TABLE IF NOT EXISTS checkin_requests (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id TEXT NOT NULL REFERENCES patients(id),
  application_plan_id TEXT REFERENCES patient_application_plans(id),
  procedure_id TEXT REFERENCES procedures(id),
  appointment_id TEXT REFERENCES appointments(id),
  patient_email TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  sent_at TEXT,
  response_received_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  form_url TEXT,
  external_response_id TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 19.5 `email_templates`

```sql
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, template_key)
);
```

### 19.6 Settings adicionais

Novas keys sugeridas em `settings`:

- `appscript_api_url`
- `appscript_api_key`
- `appscript_enabled`
- `appscript_calendar_enabled`
- `appscript_email_enabled`
- `appscript_checkin_enabled`
- `google_calendar_id`
- `clinic_email`
- `clinic_phone`
- `clinic_address`
- `checkin_delay_days`

## 20. Serviços locais futuros

### 20.1 `appScriptIntegration.service.ts`

Local sugerido:

```text
app/src/features/integrations/apps-script/services/appScriptIntegration.service.ts
```

Funções:

- `testConnection()`
- `sendAppointmentCreated(payload)`
- `sendAppointmentUpdated(payload)`
- `sendAppointmentCancelled(payload)`
- `sendCheckinForm(payload)`
- `syncCheckinResponses(filters)`
- `markCheckinSynced(responseIds)`

Responsabilidades:

- Ler settings locais.
- Validar se integração está ativa.
- Montar headers.
- Enviar HTTP.
- Tratar timeout.
- Normalizar resposta.
- Não acessar React.

### 20.2 `externalSyncQueue.service.ts`

Funções:

- `enqueue(action, entityType, entityId, payload)`
- `processPending()`
- `retry(id)`
- `markSynced(id, response)`
- `markFailed(id, error)`

### 20.3 `checkin.service.ts`

Funções:

- `scheduleForAppointment(appointmentId)`
- `scheduleForProcedure(procedureId)`
- `syncResponses()`
- `markResponseReviewed(id)`

### 20.4 Substituir `calendarSync.service.ts`

O arquivo atual:

```text
app/src/features/agenda/services/calendarSync.service.ts
```

Estado atual:

- Stub fake.
- Não faz HTTP real.

Futuro:

- Pode virar wrapper que chama `AppScriptIntegrationService`.
- Pode ser removido em favor de `externalSyncQueue.service.ts`.

### 20.5 Pontos de chamada no app

Criar appointment:

- `appointmentsService.createAppointment`
- Após `appointmentsRepository.create`
- Após `auditRepository.log`
- Enfileirar/sincronizar Apps Script.

Atualizar appointment:

- `appointmentsService.updateAppointment`
- Após update local.

Cancelar appointment:

- `appointmentsService.deleteAppointment`
- Após soft delete local.

Criar aplicação planejada:

- `patientApplicationsService.createPlan`
- Se houver `scheduledAt`, ele cria appointment.
- O envio pode acontecer no appointment service para evitar duplicidade.

Finalizar procedimento:

- `procedures.service.ts`
- Se o check-in deve ser baseado na finalização real, agendar check-in nesse ponto.

Regra para evitar duplicidade:

- Centralizar integração no service de appointments ou fila.
- Não enviar simultaneamente em `patientApplicationsService` e `appointmentsService`.

## 21. Checklist para geração do código Apps Script

Antes de gerar código Apps Script:

- Definir URL/forma de deploy do Web App.
- Definir se Web App será acessível por “Anyone with the link” com API key.
- Definir Calendar ID da clínica.
- Definir timezone `America/Sao_Paulo`.
- Definir se Calendar adicionará paciente como convidado.
- Definir se o e-mail principal será via `MailApp` ou `GmailApp`.
- Definir se check-in será Google Forms ou HTML form.
- Definir planilha de controle do Apps Script.
- Definir estrutura da aba de request logs.
- Definir estrutura da aba de check-ins.
- Definir estrutura da aba de responses.
- Definir template HTML final do e-mail.
- Definir política de retry local.
- Definir migration corretiva de `appointments`.
- Definir onde armazenar API key no app local.

Arquivos Apps Script que precisarão ser gerados depois:

- `Code.gs`
- `Router.gs`
- `Auth.gs`
- `CalendarService.gs`
- `EmailService.gs`
- `CheckinService.gs`
- `FormsService.gs` ou `HtmlFormService.gs`
- `SheetsRepository.gs`
- `RequestLogRepository.gs`
- `ResponseBuilder.gs`
- `Config.gs`
- `Templates.gs`
- `Triggers.gs`
- `README_DEPLOY.md`

Funções Apps Script essenciais:

- `doPost(e)`
- `routeAction(payload, context)`
- `validateApiKey(e, payload)`
- `createApplicationAppointment(payload)`
- `updateApplicationAppointment(payload)`
- `cancelApplicationAppointment(payload)`
- `sendCheckinForm(payload)`
- `getCheckinResponses(payload)`
- `markCheckinSynced(payload)`
- `sendTestEmail(payload)`
- `getCalendarEvent(payload)`
- `runCheckinTrigger()`
- `buildApplicationEmailHtml(data)`
- `buildCheckinEmailHtml(data)`
- `logRequest(requestId, payload, response)`

## 22. Pendências e decisões necessárias

### 1. Quais tabelas atuais já existem para suportar isso?

Existem:

- `patients`
- `appointments`
- `patient_application_plans`
- `procedures`
- `protocols`
- `administration_routes`
- `body_areas`
- `route_body_areas`
- `procedure_items_used`
- `audit_logs`
- `settings`
- `notifications`

Parcialmente úteis:

- `appointments` tem campos de sync e Google Event, mas com divergência de schema.
- `settings` já tem `google_calendar_sync_enabled`, mas não URL/API key.
- `notifications` pode exibir falhas.

### 2. Quais campos faltam?

Faltam:

- `google_calendar_event_url`
- `appscript_sync_status`
- `appscript_request_id`
- `appscript_last_error`
- `appscript_last_sync_at`
- `email_sent_at`
- `checkin_scheduled_for`
- `route_code` em `administration_routes`, ou mapeamento estável equivalente.
- Settings para URL e segredo do Apps Script.

### 3. Quais migrations serão necessárias?

Necessárias:

- Migration corretiva/padronizadora de `appointments`.
- Migration para `external_sync_queue`.
- Migration para `external_sync_logs`.
- Migration para `checkin_requests`.
- Migration opcional para `email_templates`.
- Migration opcional para `administration_routes.code`.
- Seed de settings de integração.

### 4. Onde no app deve acontecer o envio para Apps Script?

No service local, nunca no componente.

Pontos recomendados:

- `appointmentsService.createAppointment`
- `appointmentsService.updateAppointment`
- `appointmentsService.deleteAppointment`
- `proceduresService` ao finalizar aplicação, se check-in depender da finalização.

Criar:

- `AppScriptIntegrationService`
- `ExternalSyncQueueService`

### 5. O paciente já tem campo de e-mail obrigatório?

Não.

O campo existe em `patients.email`, mas o schema permite vazio. Para Apps Script, o service deve exigir e-mail apenas no fluxo de integração.

### 6. O agendamento já possui data/hora e status?

Sim, no repository atual:

- `appointment_date`
- `status`

Mas a migration inicial usa:

- `scheduled_at`
- `appointment_type`

É preciso padronizar.

### 7. Já existe tabela de appointments?

Sim.

Há uma tabela `appointments`, mas com divergência entre migrations. Resolver antes de implementar integração.

### 8. Já existe controle de check-in?

Não.

Não há tabela, service ou fluxo real de check-in.

### 9. Já existe service de integração externa?

Não.

Existe `calendarSync.service.ts`, mas é fake/no-op e deve ser substituído ou evoluído.

### 10. Como evitar duplicação de eventos/e-mails?

Usar:

- `request_id` único.
- `external_sync_queue.request_id UNIQUE`.
- Log de request no Apps Script.
- `calendar_event_id` salvo localmente.
- Upsert no Apps Script por `request_id` e/ou `application_plan_id`.
- Não chamar integração em múltiplos services para o mesmo evento.

### 11. Como o sistema deve lidar com falha de internet?

O sistema deve:

- Salvar localmente primeiro.
- Enfileirar sync.
- Marcar como `pending`.
- Exibir notificação.
- Permitir retentativa.
- Não bloquear uso local.
- Registrar auditoria e erro resumido.

### 12. Quais dados não devem ser enviados por LGPD?

Não enviar:

- Fotos.
- Histórico clínico.
- Evolução clínica.
- Intercorrências detalhadas.
- Alertas internos.
- Observações internas do paciente.
- Medicamentos e materiais utilizados.
- Lotes.
- Custos.
- Dados de estoque.
- Documentos pessoais, caso sejam adicionados no futuro.

Enviar apenas:

- Nome.
- E-mail.
- ID interno mínimo.
- Data/hora.
- Via.
- Protocolo, se aprovado pela clínica.
- Dados de contato da clínica.

### 13. Qual estrutura o Apps Script deverá receber?

Uma requisição `POST /exec` com:

- `action`
- `request_id`
- `clinic_id`
- IDs internos.
- `patient` mínimo.
- `application` mínimo.
- `clinic` mínimo.

Autenticação por:

- `X-API-Key`

### 14. Quais códigos Apps Script precisarão ser gerados depois?

Gerar depois:

- Router `doPost`.
- Validação de API key.
- Serviço Calendar.
- Serviço de e-mail.
- Serviço de check-in.
- Serviço de Forms/Sheets.
- Templates HTML.
- Repositórios de planilha.
- Logs e idempotência.
- Trigger de check-in.
- Documentação de deploy.

Nada disso deve ser implementado nesta fase.
