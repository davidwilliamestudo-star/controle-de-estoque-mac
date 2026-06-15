# Controle de Estoque — Central Clínica de Estoque, Protocolos e Rastreabilidade

Sistema local de apoio operacional clínico para a Dra. Ana Morong.

Este projeto nasce com o nome inicial de **Controle de Estoque**, mas seu escopo real é mais amplo: será uma central clínica para controle de estoque, medicamentos, materiais de enfermagem, protocolos, aplicações, histórico do paciente, evolução automática, rastreabilidade por lote, auditoria e relatórios.

O sistema deve ser simples, didático, visualmente limpo, seguro, rápido e fácil de usar por uma pessoa da área clínica, sem exigir conhecimento técnico.

---

## 1. Objetivo do sistema

Criar um sistema local, offline-first e sem mensalidade para substituir o controle em papel feito atualmente pela Dra. Ana.

O sistema deve permitir:

- cadastrar pacientes;
- cadastrar medicamentos;
- cadastrar materiais de enfermagem;
- cadastrar equipamentos, quando necessário;
- controlar lote, validade, estoque mínimo e fornecedor;
- criar protocolos personalizados;
- executar aplicações com fluxo guiado;
- selecionar área corporal em boneco SVG clicável;
- bloquear áreas incompatíveis com a via de aplicação;
- gerar evolução automática;
- copiar evolução para outro sistema/prontuário;
- registrar histórico completo do paciente;
- baixar automaticamente o estoque ao finalizar atendimento;
- emitir relatórios completos;
- manter auditoria detalhada de ações importantes;
- integrar agenda opcionalmente com Google Calendar via Apps Script.

---

## 2. Contexto operacional

Atualmente, a médica faz os registros em papel. O novo sistema deve centralizar o controle interno de estoque e aplicações, reduzindo erros, melhorando rastreabilidade e facilitando a consulta de histórico.

O sistema será usado inicialmente apenas pela Dra. Ana, com login próprio.

Existe outro sistema/prontuário oficial, mas este novo sistema funcionará como **apoio operacional interno**, focado em estoque, registro de aplicações, evolução para copiar, relatórios e rastreabilidade.

---

## 3. Stack recomendada

### Stack principal

- **Aplicação desktop:** Tauri
- **Frontend:** React
- **Linguagem:** TypeScript
- **Banco de dados local:** SQLite
- **Estilização:** Tailwind CSS
- **Componentes:** shadcn/ui ou componentes próprios
- **Formulários:** React Hook Form
- **Validação:** Zod
- **Datas:** date-fns
- **Ícones:** Lucide React
- **Relatórios/PDF:** HTML + CSS print
- **Backup:** exportação local do banco + arquivo compactado/criptografado
- **Integração opcional:** Google Calendar via Apps Script

### Justificativa

A escolha por Tauri + React + TypeScript + SQLite permite:

- custo técnico mensal zero;
- funcionamento offline;
- instalação local no computador da clínica;
- melhor controle de dados sensíveis;
- não depender de servidor;
- não depender de API paga;
- não depender de free tier;
- melhor segurança do que planilhas em nuvem;
- possibilidade futura de migração para SaaS sem refazer a regra de negócio.

---

## 4. Princípios do produto

O sistema deve seguir estes princípios:

1. **Offline-first:** o núcleo do sistema deve funcionar sem internet.
2. **Local-first:** os dados principais ficam no computador da clínica.
3. **Simplicidade clínica:** fluxo guiado, botões claros e baixa complexidade visual.
4. **Rastreabilidade total:** todo consumo deve estar vinculado a paciente, protocolo, lote, validade e data.
5. **Segurança operacional:** não permitir baixa incorreta sem confirmação.
6. **Auditoria forte:** registrar ações relevantes do sistema.
7. **Sem dependência paga:** nenhuma função essencial pode depender de API paga.
8. **Preparado para futuro SaaS:** usar IDs, clinic_id, services e repositories desde o início.
9. **Evolução por template:** não depender de IA paga para gerar evolução.
10. **Histórico completo:** cada paciente deve ter linha do tempo de aplicações.

---

## 5. Escopo principal

### Incluído no MVP

- Login local da Dra. Ana.
- Cadastro de pacientes.
- Cadastro de medicamentos.
- Cadastro de materiais de enfermagem.
- Cadastro de equipamentos.
- Cadastro de categorias personalizadas.
- Cadastro de vias de aplicação.
- Cadastro de áreas corporais.
- Controle de estoque por lote e validade.
- Cadastro de fornecedores.
- Criação de protocolos.
- Protocolo com vários medicamentos.
- Protocolo com vários materiais.
- Fluxo de atendimento/aplicação.
- Boneco SVG clicável.
- Bloqueio de áreas incompatíveis com a via do protocolo/medicamento.
- Tela de conferência dos itens utilizados.
- Seleção de lote e validade.
- Registro de intercorrência.
- Geração de evolução automática.
- Botão copiar evolução.
- Finalização com baixa automática de estoque.
- Histórico completo do paciente.
- Relatório completo do paciente em PDF.
- Relatórios de estoque.
- Alertas de estoque mínimo.
- Alertas de vencimento em 30 dias.
- Auditoria detalhada.
- Backup manual.
- Backup automático.
- Agenda simples.
- Integração opcional com Google Calendar via Apps Script.

### Fora do MVP inicial

- SaaS online.
- Multi-clínica real.
- App mobile.
- Integração direta com prontuário externo.
- IA generativa paga.
- Assinatura digital.
- Pagamentos.
- WhatsApp automático.
- Multiusuário simultâneo em rede.
- Anexos de exames e prescrições.
- Controle financeiro.

---

## 6. Perfis de usuário

Inicialmente haverá apenas um usuário:

### Dra. Ana

Permissões:

- acessar o sistema;
- cadastrar pacientes;
- cadastrar medicamentos;
- cadastrar materiais;
- cadastrar protocolos;
- registrar aplicações;
- finalizar atendimentos;
- baixar estoque;
- gerar evolução;
- copiar evolução;
- gerar relatórios;
- acessar auditoria;
- criar backup;
- restaurar backup.

Mesmo com uma usuária, o banco deve nascer preparado para múltiplos usuários no futuro.

---

## 7. Módulos do sistema

## 7.1 Dashboard

Tela inicial com visão rápida da operação.

Deve exibir:

- atendimentos/agendamentos do dia;
- estoque baixo;
- itens próximos do vencimento;
- itens vencidos;
- últimas aplicações registradas;
- últimos pacientes atendidos;
- alertas críticos;
- resumo de consumo do mês.

Cards sugeridos:

- Aplicações hoje;
- Estoque baixo;
- Vencem em 30 dias;
- Protocolos mais usados;
- Últimos pacientes;
- Pendências de sincronização com agenda.

---

## 7.2 Pacientes

Cadastro e histórico dos pacientes.

Campos iniciais:

- nome completo;
- telefone;
- e-mail;
- data de nascimento;
- observações;
- observações de alerta;
- status ativo/inativo.

Funcionalidades:

- listar pacientes;
- buscar por nome, telefone e e-mail;
- criar paciente;
- editar paciente;
- inativar paciente;
- abrir perfil do paciente;
- ver linha do tempo de aplicações;
- ver protocolos realizados;
- ver medicamentos utilizados;
- ver áreas corporais mais utilizadas;
- ver evoluções registradas;
- copiar evolução antiga;
- gerar relatório completo em PDF.

---

## 7.3 Estoque

Controle de medicamentos, materiais e equipamentos.

### Tipos de item

- Medicamento;
- Material de enfermagem;
- Equipamento;
- Outro.

### Regras

- Medicamentos sempre precisam de lote e validade.
- Materiais de enfermagem sempre precisam de lote e validade.
- Equipamentos podem não precisar de lote e validade.
- Todo item deve ter categoria.
- Todo item deve ter unidade de medida.
- Todo item pode ter fornecedor.
- Todo item pode ter estoque mínimo.
- O sistema deve alertar quando o estoque estiver abaixo do mínimo.
- O sistema deve alertar quando um lote vencer em até 30 dias.
- O sistema deve bloquear ou alertar fortemente ao tentar usar item vencido.
- O sistema nunca deve permitir estoque negativo.

### Exemplos de medicamentos

- Vitamina C;
- Complexo B;
- Glutationa;
- Medicamentos endovenosos;
- Medicamentos intramusculares;
- Medicamentos subcutâneos.

### Exemplos de materiais

- Seringa;
- Agulha;
- Álcool swab;
- Luva;
- Algodão;
- Equipo;
- Cateter;
- Máscara;
- Touca;
- Outros descartáveis.

### Exemplos de equipamentos

- Equipamento de apoio;
- Dispositivo reutilizável;
- Acessório clínico não consumível.

---

## 7.4 Categorias

O sistema deve permitir criar categorias personalizadas.

Exemplos:

- Endovenoso;
- Intramuscular;
- Subcutâneo;
- Material de enfermagem;
- Seringas;
- Agulhas;
- Descartáveis;
- Vitaminas;
- Equipamentos;
- Outros.

Importante: categoria não deve ser confundida com via de aplicação.

Modelo recomendado:

- `item_type`: medicamento, material, equipamento;
- `category_id`: categoria personalizada;
- `administration_route_id`: via de aplicação, quando aplicável.

---

## 7.5 Vias de aplicação

Cadastro de vias de aplicação.

Exemplos:

- Endovenosa;
- Intramuscular;
- Subcutânea;
- Oral;
- Tópica;
- Não aplicável.

Cada via deve ter áreas corporais permitidas.

Exemplo:

- Intramuscular: glúteo direito, glúteo esquerdo, deltoide direito, deltoide esquerdo, coxa direita, coxa esquerda.
- Subcutânea: abdômen, braço direito, braço esquerdo, coxa direita, coxa esquerda.
- Endovenosa: braço direito, braço esquerdo, mão direita, mão esquerda, antebraço direito, antebraço esquerdo.

---

## 7.6 Boneco SVG clicável

O sistema deve ter um corpo humano em SVG com áreas clicáveis.

Áreas iniciais:

- glúteo direito;
- glúteo esquerdo;
- deltoide direito;
- deltoide esquerdo;
- abdômen;
- coxa direita;
- coxa esquerda;
- braço direito;
- braço esquerdo;
- região lombar;
- antebraço direito;
- antebraço esquerdo;
- mão direita;
- mão esquerda.

### Regra de compatibilidade

O sistema deve permitir clicar apenas nas áreas compatíveis com a via de aplicação do protocolo ou medicamento.

Exemplo:

Se o protocolo for endovenoso:

- áreas endovenosas ficam ativas;
- áreas intramusculares ficam bloqueadas;
- áreas subcutâneas ficam bloqueadas.

Se o protocolo for intramuscular:

- glúteos, deltoides e coxas ficam ativos;
- áreas endovenosas ficam bloqueadas;
- áreas incompatíveis ficam cinza.

Se o usuário tentar clicar em área bloqueada, exibir mensagem:

> Esta área não é permitida para a via de aplicação selecionada.

---

## 7.7 Protocolos

A Dra. Ana poderá criar vários protocolos.

Cada protocolo terá:

- nome;
- descrição;
- categoria;
- via principal de aplicação;
- status ativo/inativo;
- medicamentos padrão;
- materiais padrão;
- quantidades padrão;
- observações internas;
- modelo de evolução;
- áreas permitidas, herdadas da via;
- possibilidade de edição antes de finalizar atendimento.

### Exemplo de protocolo

Protocolo Vitamina C EV:

Medicamentos:

- Vitamina C — 10 mL;
- Complexo B — 2 mL.

Materiais:

- Seringa — 1 unidade;
- Agulha — 1 unidade;
- Álcool swab — 2 unidades;
- Luva — 1 par;
- Equipo — 1 unidade, se aplicável.

---

## 7.8 Atendimento / Aplicação

Fluxo principal do sistema.

### Etapas

1. Selecionar paciente.
2. Selecionar protocolo.
3. Sistema carrega medicamentos e materiais padrão.
4. Sistema identifica a via de aplicação.
5. Sistema libera apenas áreas compatíveis no boneco SVG.
6. Selecionar área corporal.
7. Conferir itens utilizados.
8. Adicionar, remover ou editar itens.
9. Selecionar lote e validade de cada item.
10. Registrar se houve intercorrência.
11. Inserir observações.
12. Gerar evolução automática.
13. Copiar evolução.
14. Confirmar finalização.
15. Baixar estoque automaticamente.
16. Registrar histórico do paciente.
17. Registrar auditoria.

### Estados do atendimento

- `draft`: rascunho em andamento;
- `ready_to_finalize`: pronto para finalizar;
- `finalized`: finalizado;
- `cancelled`: cancelado.

### Regras

- Atendimento em rascunho não baixa estoque.
- Estoque só baixa após confirmação final.
- Após finalizado, não deve ser editado livremente.
- Correções após finalização devem gerar log de auditoria.
- Todo atendimento finalizado deve ter paciente, protocolo, área corporal, itens usados e evolução.
- Se algum item obrigatório não tiver lote, bloquear finalização.
- Se algum item estiver vencido, bloquear ou exigir justificativa conforme configuração.
- Se estoque for insuficiente, bloquear finalização.

---

## 7.9 Evolução automática

A evolução deve ser gerada por template, sem depender de IA externa.

### Variáveis possíveis

- `{{patient_name}}`
- `{{procedure_date}}`
- `{{protocol_name}}`
- `{{body_area}}`
- `{{medications}}`
- `{{materials}}`
- `{{batches}}`
- `{{expiration_dates}}`
- `{{intercurrence_status}}`
- `{{intercurrence_description}}`
- `{{notes}}`
- `{{clinic_name}}`
- `{{professional_name}}`

### Exemplo de evolução

Paciente {{patient_name}} realizou {{protocol_name}} em {{procedure_date}}.

Área registrada: {{body_area}}.

Medicamentos utilizados:
{{medications}}

Materiais utilizados:
{{materials}}

Procedimento registrado {{intercurrence_status}}.

Observações: {{notes}}

### Botões

- Gerar evolução;
- Copiar evolução;
- Editar evolução;
- Salvar evolução;
- Voltar para conferência;
- Finalizar atendimento.

### Regras

- A evolução gerada deve ficar salva no histórico do atendimento.
- A evolução pode ser editada antes da finalização.
- Alterações na evolução devem ser registradas na auditoria.
- Deve haver botão para copiar a evolução para outro sistema/prontuário.

---

## 7.10 Histórico do paciente

Cada paciente deve ter histórico completo por data.

O histórico deve exibir:

- data da aplicação;
- protocolo realizado;
- área corporal;
- medicamentos utilizados;
- materiais utilizados;
- lote;
- validade;
- intercorrência;
- evolução gerada;
- observações;
- status;
- data de finalização.

### Indicadores do paciente

O perfil do paciente deve mostrar:

- total de aplicações;
- protocolo mais realizado;
- medicamento mais utilizado;
- área corporal mais utilizada;
- última aplicação;
- quantidade de intercorrências;
- histórico por período.

---

## 7.11 Relatórios

O sistema deve gerar relatórios internos e PDFs.

### Relatórios de estoque

- Estoque atual;
- Estoque baixo;
- Itens próximos do vencimento;
- Itens vencidos;
- Movimentação por período;
- Entradas por período;
- Saídas por período;
- Consumo por medicamento;
- Consumo por material;
- Consumo por fornecedor;
- Consumo por protocolo.

### Relatórios de paciente

- Histórico completo do paciente;
- Aplicações por período;
- Protocolos realizados;
- Medicamentos utilizados;
- Materiais utilizados;
- Lotes utilizados;
- Validades dos lotes utilizados;
- Áreas corporais utilizadas;
- Área mais utilizada;
- Evoluções registradas;
- Intercorrências.

### Relatórios de rastreabilidade

- Lotes utilizados em cada paciente;
- Pacientes que utilizaram determinado lote;
- Procedimentos que consumiram determinado item;
- Movimentações relacionadas a determinado lote.

### PDF

O sistema deve permitir exportar relatórios em PDF usando HTML + CSS print.

Não usar API paga para PDF.

---

## 7.12 Agenda

Agenda básica integrada ao sistema.

### Campos

- paciente;
- tipo de agendamento;
- data/hora;
- duração;
- status;
- observações;
- e-mail do paciente;
- status de sincronização com Google Calendar.

### Tipos

- Aplicação;
- Consulta;
- Retorno;
- Outro.

### Status

- Agendado;
- Confirmado;
- Realizado;
- Faltou;
- Cancelado.

### Integração Google Calendar via Apps Script

A integração com Google Calendar deve ser opcional.

Fluxo:

1. Criar agendamento no sistema local.
2. Se houver internet e integração ativa, enviar dados para endpoint Apps Script.
3. Apps Script cria evento no Google Calendar da Dra. Ana.
4. Se o paciente tiver e-mail, incluir como convidado.
5. Google Calendar envia notificação/convite.
6. Sistema salva status de sincronização.

### Status de sincronização

- `not_synced`: não sincronizado;
- `pending`: pendente;
- `synced`: sincronizado;
- `failed`: falhou.

### Regra importante

O sistema principal não pode depender da agenda online para funcionar.

Se não houver internet, o agendamento fica salvo localmente e marcado como pendente de sincronização.

---

## 7.13 Auditoria

A auditoria é um requisito crítico.

O sistema deve registrar ações importantes.

### Eventos auditáveis

- login realizado;
- tentativa de login inválida;
- logout;
- cadastro de paciente;
- edição de paciente;
- inativação de paciente;
- cadastro de medicamento;
- edição de medicamento;
- cadastro de material;
- edição de material;
- entrada de estoque;
- ajuste manual de estoque;
- baixa automática de estoque;
- tentativa de uso de item vencido;
- tentativa de finalizar com estoque insuficiente;
- criação de protocolo;
- edição de protocolo;
- atendimento iniciado;
- atendimento finalizado;
- atendimento cancelado;
- evolução gerada;
- evolução editada;
- evolução copiada;
- relatório exportado;
- backup criado;
- backup restaurado;
- configuração alterada;
- agendamento criado;
- agendamento sincronizado;
- falha de sincronização com agenda.

### Dados do log

Cada log deve registrar:

- ID;
- data/hora;
- usuário;
- ação;
- entidade afetada;
- ID da entidade;
- dados antes;
- dados depois;
- descrição legível;
- dispositivo/local;
- hash do log anterior, se possível;
- hash atual, se possível.

### Regra

Logs não devem ser apagados pelo usuário comum.

---

## 7.14 Backup

O sistema deve ter estratégia de backup local.

### Backup manual

Tela de backup com botão:

- Gerar backup agora;
- Escolher pasta de destino;
- Exportar banco local;
- Compactar backup;
- Opcionalmente criptografar com senha.

### Backup automático

O sistema deve gerar backup automático:

- ao fechar o app;
- ou uma vez por dia;
- ou conforme configuração.

### Retenção sugerida

- manter últimos 7 backups diários;
- manter últimos 4 backups semanais;
- manter últimos 12 backups mensais.

### Restauração

O sistema deve permitir:

- selecionar arquivo de backup;
- validar arquivo;
- mostrar data do backup;
- criar cópia do banco atual antes de restaurar;
- restaurar backup;
- registrar auditoria da restauração.

---

## 8. Regras de negócio críticas

## 8.1 Estoque

- Nunca permitir estoque negativo.
- Todo medicamento precisa de lote e validade.
- Todo material precisa de lote e validade.
- Equipamentos podem não ter lote e validade.
- Estoque só baixa ao finalizar atendimento.
- Atendimento em rascunho não baixa estoque.
- Cancelamento de atendimento não finalizado não altera estoque.
- Correção de atendimento finalizado deve gerar ajuste e auditoria.
- Entrada de estoque deve criar movimentação.
- Saída automática deve criar movimentação.
- Ajuste manual deve exigir motivo.
- Item abaixo do estoque mínimo deve gerar alerta.
- Item vencendo em até 30 dias deve gerar alerta.
- Item vencido deve ser bloqueado ou exigir justificativa, conforme configuração.

## 8.2 Protocolos

- Protocolo pode ter vários medicamentos.
- Protocolo pode ter vários materiais.
- Protocolo pode ter uma via principal.
- Protocolo pode ter modelo próprio de evolução.
- Protocolo inativo não aparece no fluxo de novo atendimento.
- Itens padrão do protocolo podem ser ajustados antes da finalização.

## 8.3 Área corporal

- Área corporal deve ser compatível com a via de aplicação.
- Áreas incompatíveis devem ficar bloqueadas.
- Área selecionada deve entrar automaticamente na evolução.
- Área selecionada deve aparecer no histórico do paciente.
- O sistema deve calcular área mais utilizada por paciente.

## 8.4 Evolução

- Evolução deve ser gerada automaticamente por template.
- Evolução deve poder ser copiada.
- Evolução deve poder ser editada antes da finalização.
- Evolução final deve ficar salva no atendimento.
- Evolução copiada deve gerar log de auditoria.

## 8.5 Paciente

- Paciente pode ter vários atendimentos.
- Paciente pode ter relatório completo.
- Paciente deve ter histórico por data.
- Paciente deve permitir consulta de lotes utilizados.
- Paciente deve permitir consulta de protocolos realizados.
- Paciente deve permitir consulta de áreas mais utilizadas.

## 8.6 Auditoria

- Toda ação relevante deve gerar log.
- Logs devem guardar antes/depois quando aplicável.
- Logs devem ser consultáveis por período, ação e entidade.
- Logs não devem ser editados pelo usuário.
- Restauração de backup deve ser auditada.

---

## 9. Modelo de banco de dados inicial

Usar SQLite com IDs em formato UUID string.

Todas as tabelas principais devem ter:

- `id`
- `clinic_id`
- `created_at`
- `updated_at`
- `deleted_at`, quando fizer sentido.

Mesmo sendo uma clínica só, incluir `clinic_id` desde o início para facilitar futura migração para SaaS.

---

## 9.1 users

Usuários do sistema.

Campos:

- `id`
- `clinic_id`
- `name`
- `email`
- `password_hash`
- `role`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.2 patients

Pacientes.

Campos:

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

---

## 9.3 inventory_categories

Categorias personalizadas.

Campos:

- `id`
- `clinic_id`
- `name`
- `description`
- `applies_to`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.4 administration_routes

Vias de aplicação.

Campos:

- `id`
- `clinic_id`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

Exemplos:

- endovenosa;
- intramuscular;
- subcutânea;
- oral;
- tópica;
- não aplicável.

---

## 9.5 body_areas

Áreas corporais.

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

Exemplos:

- glúteo direito;
- glúteo esquerdo;
- deltoide direito;
- deltoide esquerdo;
- abdômen;
- braço direito;
- braço esquerdo;
- coxa direita;
- coxa esquerda;
- região lombar;
- antebraço direito;
- antebraço esquerdo;
- mão direita;
- mão esquerda.

---

## 9.6 route_body_areas

Relaciona vias de aplicação com áreas permitidas.

Campos:

- `id`
- `clinic_id`
- `administration_route_id`
- `body_area_id`
- `created_at`

Exemplo:

- intramuscular -> glúteo direito;
- intramuscular -> glúteo esquerdo;
- subcutânea -> abdômen;
- endovenosa -> antebraço direito.

---

## 9.7 suppliers

Fornecedores.

Campos:

- `id`
- `clinic_id`
- `name`
- `phone`
- `email`
- `document`
- `notes`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.8 inventory_items

Itens do estoque.

Campos:

- `id`
- `clinic_id`
- `name`
- `item_type`
- `category_id`
- `administration_route_id`
- `unit`
- `current_stock`
- `minimum_stock`
- `requires_batch`
- `requires_expiration`
- `supplier_id`
- `notes`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

`item_type` pode ser:

- medication;
- material;
- equipment;
- other.

---

## 9.9 inventory_batches

Lotes dos itens.

Campos:

- `id`
- `clinic_id`
- `inventory_item_id`
- `batch_number`
- `expiration_date`
- `supplier_id`
- `entry_date`
- `initial_quantity`
- `current_quantity`
- `unit_cost`
- `invoice_number`
- `notes`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.10 stock_movements

Movimentações de estoque.

Campos:

- `id`
- `clinic_id`
- `inventory_item_id`
- `inventory_batch_id`
- `movement_type`
- `quantity`
- `unit`
- `reason`
- `patient_id`
- `protocol_id`
- `procedure_id`
- `user_id`
- `movement_date`
- `notes`
- `created_at`

`movement_type` pode ser:

- entry;
- exit;
- automatic_exit;
- adjustment;
- loss;
- expired;
- correction.

---

## 9.11 protocols

Protocolos.

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

---

## 9.12 protocol_items

Itens padrão dos protocolos.

Campos:

- `id`
- `clinic_id`
- `protocol_id`
- `inventory_item_id`
- `item_role`
- `default_quantity`
- `unit`
- `is_required`
- `notes`
- `created_at`
- `updated_at`
- `deleted_at`

`item_role` pode ser:

- medication;
- material;
- equipment;
- other.

---

## 9.13 procedures

Atendimentos/aplicações.

Campos:

- `id`
- `clinic_id`
- `patient_id`
- `protocol_id`
- `appointment_id`
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

`status` pode ser:

- draft;
- ready_to_finalize;
- finalized;
- cancelled.

---

## 9.14 procedure_items_used

Itens usados em um atendimento.

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

A tabela deve guardar snapshots de lote e validade para preservar histórico mesmo se o cadastro do lote for alterado no futuro.

---

## 9.15 evolution_templates

Modelos de evolução.

Campos:

- `id`
- `clinic_id`
- `name`
- `template_text`
- `applies_to_protocol_id`
- `is_default`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.16 appointments

Agenda.

Campos:

- `id`
- `clinic_id`
- `patient_id`
- `appointment_type`
- `status`
- `scheduled_at`
- `duration_minutes`
- `notes`
- `patient_email_snapshot`
- `google_calendar_event_id`
- `sync_status`
- `last_sync_attempt_at`
- `sync_error`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `deleted_at`

---

## 9.17 audit_logs

Logs de auditoria.

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

---

## 9.18 settings

Configurações gerais.

Campos:

- `id`
- `clinic_id`
- `key`
- `value`
- `created_at`
- `updated_at`

Exemplos de configurações:

- `clinic_name`
- `professional_name`
- `expiration_alert_days`
- `default_backup_path`
- `auto_backup_enabled`
- `google_calendar_sync_enabled`
- `google_apps_script_url`
- `lock_after_minutes`
- `block_expired_items`

---

## 10. Arquitetura de pastas sugerida

```txt
src/
  app/
    App.tsx
    routes.tsx

  components/
    ui/
    layout/
    forms/
    feedback/
    body-map/

  features/
    auth/
      pages/
      components/
      services/
      repositories/
      schemas/

    dashboard/
      pages/
      components/

    patients/
      pages/
      components/
      services/
      repositories/
      schemas/

    inventory/
      pages/
      components/
      services/
      repositories/
      schemas/

    protocols/
      pages/
      components/
      services/
      repositories/
      schemas/

    procedures/
      pages/
      components/
      services/
      repositories/
      schemas/

    reports/
      pages/
      components/
      services/

    appointments/
      pages/
      components/
      services/
      repositories/

    audit/
      pages/
      services/
      repositories/

    backup/
      pages/
      services/

    settings/
      pages/
      services/
      repositories/

  lib/
    db/
      migrations/
      sqlite.ts
      migrate.ts

    utils/
    dates/
    pdf/
    clipboard/
    security/

  styles/
    globals.css
```

---

## 11. Camadas recomendadas

A aplicação deve evitar regra de negócio diretamente nas telas.

### UI

Responsável por:

- exibir telas;
- capturar inputs;
- mostrar alertas;
- chamar services.

### Services

Responsáveis por regras de negócio.

Exemplos:

- `procedureService.finalizeProcedure()`
- `inventoryService.decreaseStock()`
- `evolutionService.generateEvolution()`
- `auditService.log()`
- `backupService.createBackup()`
- `appointmentSyncService.syncWithGoogleCalendar()`

### Repositories

Responsáveis por comunicação com SQLite.

Exemplos:

- `patientsRepository`
- `inventoryRepository`
- `protocolsRepository`
- `proceduresRepository`
- `auditRepository`
- `appointmentsRepository`

### Schemas

Responsáveis por validação com Zod.

---

## 12. Finalização de atendimento

A finalização deve ser transacional.

Fluxo técnico:

```txt
BEGIN TRANSACTION

1. Validar atendimento.
2. Validar paciente.
3. Validar protocolo.
4. Validar área corporal.
5. Validar itens usados.
6. Validar lotes.
7. Verificar validade dos lotes.
8. Verificar estoque disponível.
9. Criar/atualizar procedure como finalized.
10. Criar procedure_items_used.
11. Dar baixa em inventory_batches.
12. Atualizar inventory_items.current_stock.
13. Criar stock_movements.
14. Salvar evolution_text.
15. Criar audit_logs.
16. Atualizar appointment como realizado, se houver.

COMMIT
```

Se qualquer etapa falhar:

```txt
ROLLBACK
```

---

## 13. Geração de alertas

### Estoque baixo

Condição:

```txt
inventory_items.current_stock <= inventory_items.minimum_stock
```

### Próximo do vencimento

Condição:

```txt
expiration_date <= hoje + 30 dias
```

O número de dias deve vir de `settings.expiration_alert_days`.

### Vencido

Condição:

```txt
expiration_date < hoje
```

Regra recomendada:

- bloquear uso de item vencido;
- registrar tentativa em audit_logs.

---

## 14. UX/UI

O sistema deve ser extremamente simples.

### Diretrizes

- Uma tarefa principal por tela.
- Fluxo em etapas.
- Botões grandes.
- Textos diretos.
- Alertas visuais claros.
- Confirmação antes de finalizar.
- Possibilidade de voltar e editar antes da baixa.
- Nada de telas poluídas.
- Não exigir conhecimento técnico.
- Usar linguagem clínica simples.

### Fluxo visual do atendimento

```txt
Paciente → Protocolo → Área corporal → Conferência → Evolução → Finalização
```

### Botões principais

- Novo atendimento;
- Novo paciente;
- Novo protocolo;
- Nova entrada de estoque;
- Gerar evolução;
- Copiar evolução;
- Voltar e editar;
- Confirmar finalização;
- Gerar relatório;
- Criar backup.

### Cores sugeridas

- Vermelho: vencido, erro, bloqueio crítico.
- Amarelo: alerta, vencimento próximo, estoque baixo.
- Verde: sucesso, finalizado, copiado.
- Azul/cinza: informação neutra.

---

## 15. Segurança e LGPD

O sistema armazenará dados sensíveis de saúde. Por isso, deve reduzir exposição.

### Requisitos mínimos

- Login com senha.
- Hash de senha.
- Bloqueio por inatividade.
- Backup local.
- Backup criptografado, se possível.
- Auditoria.
- Exclusão lógica.
- Controle de acesso preparado para futuro.
- Não enviar backups por WhatsApp.
- Não expor banco em nuvem sem necessidade.
- Não usar Google Sheets como banco principal.
- Não depender de Firebase/Supabase/Vercel para dados reais no MVP local.

### Recomendação

Começar com banco SQLite local e backup seguro.

Futuramente, avaliar:

- SQLCipher;
- criptografia de campos sensíveis;
- senha mestre;
- política formal de backup;
- exportação LGPD por paciente.

---

## 16. Integração com Google Calendar via Apps Script

A integração deve ficar isolada em um módulo.

### Endpoint esperado

O sistema local pode enviar para o Apps Script:

```json
{
  "patientName": "Maria Silva",
  "patientEmail": "maria@email.com",
  "appointmentType": "Aplicação",
  "scheduledAt": "2026-06-10T14:00:00",
  "durationMinutes": 60,
  "notes": "Aplicação agendada pelo sistema Controle de Estoque"
}
```

### Resposta esperada

```json
{
  "success": true,
  "googleCalendarEventId": "abc123",
  "message": "Evento criado com sucesso"
}
```

### Em caso de erro

Salvar:

- status `failed`;
- mensagem do erro;
- data da tentativa;
- opção de tentar novamente.

---

## 17. Requisitos de PDF

O sistema deve gerar relatórios em tela própria com layout de impressão.

### Relatório do paciente

Deve conter:

- cabeçalho com nome da clínica;
- dados do paciente;
- período do relatório;
- resumo geral;
- total de aplicações;
- protocolo mais realizado;
- medicamento mais utilizado;
- área mais utilizada;
- lista cronológica de atendimentos;
- medicamentos por atendimento;
- materiais por atendimento;
- lote e validade;
- intercorrências;
- evolução de cada atendimento;
- rodapé com data de emissão.

### Relatório de estoque

Deve conter:

- estoque atual;
- lote;
- validade;
- fornecedor;
- quantidade atual;
- estoque mínimo;
- status;
- alertas.

---

## 18. Checklist MVP

### Fundação

- [ ] Criar projeto Tauri + React + TypeScript.
- [ ] Configurar SQLite.
- [ ] Criar migrations.
- [ ] Criar layout base.
- [ ] Criar autenticação local.
- [ ] Criar dashboard inicial.

### Cadastros

- [ ] Pacientes.
- [ ] Categorias.
- [ ] Vias de aplicação.
- [ ] Áreas corporais.
- [ ] Fornecedores.
- [ ] Medicamentos.
- [ ] Materiais.
- [ ] Equipamentos.
- [ ] Lotes.
- [ ] Protocolos.
- [ ] Templates de evolução.

### Atendimento

- [ ] Selecionar paciente.
- [ ] Selecionar protocolo.
- [ ] Carregar itens padrão.
- [ ] Selecionar área no SVG.
- [ ] Bloquear áreas incompatíveis.
- [ ] Conferir itens.
- [ ] Selecionar lote.
- [ ] Registrar intercorrência.
- [ ] Gerar evolução.
- [ ] Copiar evolução.
- [ ] Finalizar.
- [ ] Baixar estoque.
- [ ] Registrar auditoria.
- [ ] Atualizar histórico do paciente.

### Relatórios

- [ ] Histórico do paciente.
- [ ] PDF do paciente.
- [ ] Estoque atual.
- [ ] Estoque baixo.
- [ ] Vencimentos.
- [ ] Consumo por período.
- [ ] Pacientes por lote.
- [ ] Lotes por paciente.

### Segurança

- [ ] Login.
- [ ] Hash de senha.
- [ ] Bloqueio por inatividade.
- [ ] Backup manual.
- [ ] Backup automático.
- [ ] Auditoria.
- [ ] Restauração de backup.

### Agenda

- [ ] Agenda local.
- [ ] Status de agendamento.
- [ ] Integração Apps Script.
- [ ] Status de sincronização.
- [ ] Tentar sincronizar novamente.

---

## 19. Roadmap

### Fase 1 — MVP local essencial

- Login.
- Pacientes.
- Estoque.
- Lotes.
- Protocolos.
- Atendimento guiado.
- Evolução automática.
- Copiar evolução.
- Baixa automática.
- Histórico do paciente.
- Auditoria básica.

### Fase 2 — Rastreabilidade e relatórios

- Relatório completo do paciente.
- Relatório de estoque.
- Relatório de consumo.
- Pacientes por lote.
- Lotes por paciente.
- Exportação PDF.
- Auditoria avançada.

### Fase 3 — Agenda e integração

- Agenda local.
- Integração Apps Script.
- Google Calendar.
- Convite por e-mail.
- Sincronização pendente.
- Tratamento de falhas.

### Fase 4 — Segurança avançada

- Backup criptografado.
- Restauração guiada.
- Bloqueio por inatividade.
- Hash chain nos logs.
- Criptografia de dados sensíveis, se necessário.

### Fase 5 — Preparação para SaaS

- Multiusuário.
- Permissões por perfil.
- Migração SQLite -> Postgres.
- API backend.
- Multi-clínica.
- Auth online.
- Backups remotos.
- Painel administrativo.

---

## 20. Critérios de aceite

O MVP só deve ser considerado pronto quando:

- for possível cadastrar paciente;
- for possível cadastrar medicamento com lote e validade;
- for possível cadastrar material com lote e validade;
- for possível cadastrar protocolo com vários itens;
- for possível iniciar atendimento;
- for possível selecionar área compatível no SVG;
- áreas incompatíveis estiverem bloqueadas;
- for possível conferir itens usados;
- for possível selecionar lote;
- o sistema impedir estoque insuficiente;
- o sistema alertar vencimento;
- o sistema bloquear ou alertar item vencido;
- for possível gerar evolução;
- for possível copiar evolução;
- for possível finalizar atendimento;
- a finalização baixar estoque corretamente;
- o histórico do paciente for atualizado;
- as movimentações de estoque forem registradas;
- a auditoria for registrada;
- o relatório do paciente puder ser gerado;
- backup manual funcionar;
- app funcionar sem internet.

---

## 21. Observações finais para desenvolvimento

Este sistema deve ser construído como produto clínico operacional, não como planilha avançada.

Prioridade máxima:

1. Integridade dos dados.
2. Rastreabilidade.
3. Simplicidade de uso.
4. Segurança.
5. Funcionamento offline.
6. Histórico completo.
7. Baixa automática confiável.
8. Auditoria.

Não adicionar complexidade desnecessária no MVP.

Não usar IA generativa para evolução no início.

Não usar banco em nuvem no MVP.

Não depender de API paga.

Não criar uma arquitetura que obrigue mensalidade.

O sistema precisa ser simples para a Dra. Ana usar, mas tecnicamente robusto o suficiente para controlar estoque clínico, lotes, validade, aplicações e histórico do paciente com segurança.
