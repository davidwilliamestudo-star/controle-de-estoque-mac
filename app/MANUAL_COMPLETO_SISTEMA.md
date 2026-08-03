# Manual Completo do Sistema  
## Controle de Estoque — Dra. Ana Morong (VoltQ)

**Versão do documento:** 2026-08-02  
**Aplicação:** Desktop local (Tauri v2 + React + TypeScript + SQLite)  
**Escopo:** Manual de uso + relatório de testes de verificação do sistema  

---

## Sumário

1. [O que é o sistema](#1-o-que-é-o-sistema)  
2. [Como iniciar](#2-como-iniciar)  
3. [Login e acesso](#3-login-e-acesso)  
4. [Mapa do menu](#4-mapa-do-menu)  
5. [Fluxo ideal do dia a dia](#5-fluxo-ideal-do-dia-a-dia)  
6. [Módulos — guia completo](#6-módulos--guia-completo)  
7. [Cadastros iniciais recomendados](#7-cadastros-iniciais-recomendados)  
8. [Checklist mensal da doutora](#8-checklist-mensal-da-doutora)  
9. [Relatório de testes (auditoria técnica)](#9-relatório-de-testes-auditoria-técnica)  
10. [Limitações conhecidas](#10-limitações-conhecidas)  
11. [Solução de problemas](#11-solução-de-problemas)  
12. [Glossário](#12-glossário)  

---

## 1. O que é o sistema

Sistema **local** (não depende de internet para o uso diário) para a clínica:

| Área | Função |
|------|--------|
| **Clínico** | Pacientes, protocolos, aplicações, mapa corporal, evoluções |
| **Estoque** | Medicamentos, materiais, lotes, validade, etiquetas QR |
| **Agenda** | Compromissos com validação de estoque |
| **Financeiro** | Contas a receber/pagar, fluxo de caixa, DRE simplificada |
| **Gestão** | Resumo do mês, relatórios PDF/CSV, auditoria, backup |

Dados ficam no **SQLite** da máquina (com modo WAL). Há 28 migrations versionadas.

---

## 2. Como iniciar

### Desenvolvimento (Windows)

```bash
cd "caminho/para/app"
npm install
npm run tauri:dev
```

### Build de produção (frontend)

```bash
npm run build
```

### Instalador Windows / Mac

```bash
npm run tauri:build:windows   # Windows (NSIS)
npm run tauri:build:mac       # macOS
```

### Pré-requisitos

- Node.js 18+  
- Rust + Tauri CLI (para app nativo)  
- No Mac: Xcode Command Line Tools (ver `COMECE_AQUI_MAC.md`)  

---

## 3. Login e acesso

| Campo | Valor padrão (seed de desenvolvimento) |
|-------|----------------------------------------|
| E-mail | `ana@morong.med.br` |
| Senha | `Ana2026!` |

> **Importante:** Em ambiente real, altere a senha nas configurações / usuários assim que possível.

- Rotas protegidas redirecionam para `/login` se não autenticado.  
- Login bem-sucedido vai para o **Dashboard**.  

---

## 4. Mapa do menu

| Menu | Rota | Descrição |
|------|------|-----------|
| Dashboard | `/dashboard` | KPIs, alertas, ações rápidas |
| Agenda | `/agenda` | Compromissos |
| Pacientes | `/patients` | Cadastro e lista |
| Aplicações | `/procedures` | Sessões clínicas |
| Protocolos | `/protocols` | Composição + insumos |
| Estoque | `/inventory` | Itens gerais |
| Medicamentos | `/medications` | Filtro medicamentos |
| Materiais | `/materials` | Seringas, agulhas etc. |
| Equipamentos | `/equipment` | Equipamentos |
| Etiquetas | `/labels` | Impressão / QR |
| Financeiro | `/financial` | Painel financeiro |
| Resumo do Mês | `/resumo-mes` | Consumo e custos simples |
| Relatórios | `/reports` | Central de PDFs |
| Auditoria | `/audit` | Logs |
| Configurações | `/settings` | Clínica e integrações |
| Backup | `/backup` | Cópia de segurança |

### Rotas adicionais (acesso interno / atalhos)

| Rota | Função |
|------|--------|
| `/patients/$patientId` | Prontuário |
| `/procedures/new` | Nova aplicação |
| `/procedures/execute/$applicationPlanId` | Executar plano |
| `/inventory/entry` | Entrada de estoque |
| `/inventory/items/new` | Novo item |
| `/inventory/items/$itemId/edit` | Editar item |
| `/inventory/suppliers` | Fornecedores |
| `/inventory/locations` | Locais de estoque |
| `/inventory/financial` | Financeiro do estoque |
| `/financial/receivables` | Contas a receber |
| `/financial/payables` | Contas a pagar |
| `/financial/cash-flow` | Fluxo de caixa |
| `/financial/categories` | Categorias financeiras |
| `/financial/reports` | DRE e export CSV |
| `/reports/purchase-plan` | Lista de compras |
| `/settings/import-export` | Importar / exportar |

---

## 5. Fluxo ideal do dia a dia

```
1. Entrada de estoque (com custo unitário)
        ↓
2. Protocolos com substância + seringa + agulha
        ↓
3. Paciente cadastrado (nome, CPF, telefone)
        ↓
4. Nova aplicação → protocolo → itens pré-preenchidos
        ↓
5. Ajustar quantidades se preciso → checkout (valor / pago)
        ↓
6. Finalizar → baixa estoque + conta a receber
        ↓
7. No fim do mês → Resumo do Mês + Relatórios / Financeiro
```

### As 3 ações principais (visão da doutora)

1. **Entrada de estoque** — Dashboard → “Entrada de estoque” ou Estoque → Nova Entrada  
2. **Nova aplicação** — Aplicações → Nova  
3. **Resumo do mês** — menu **Resumo do Mês**  

---

## 6. Módulos — guia completo

### 6.1 Dashboard

**O que mostra**

- Indicadores do período (atendimentos, alertas)  
- Ações rápidas: entrada, nova aplicação, resumo do mês, pacientes, etiquetas, relatórios  

**Como usar**

1. Escolha o período (hoje, 7d, 30d, mês, personalizado).  
2. Use os atalhos para os fluxos mais comuns.  

---

### 6.2 Agenda

**Funções**

- Criar / editar / cancelar compromissos  
- Validação de estoque do protocolo antes de agendar  

**Como usar**

1. Abra **Agenda**.  
2. Novo compromisso: paciente, data, protocolo.  
3. Se faltar insumo, o painel de validação avisa.  

---

### 6.3 Pacientes

**Cadastro (Novo Paciente)**

| Campo | Obrigatório | Observação |
|-------|-------------|------------|
| Nome completo | Sim | — |
| CPF | Não | Máscara `000.000.000-00` |
| Data de nascimento | Não | — |
| Telefone | Não | Máscara WhatsApp |
| E-mail | Não | Validado se preenchido |
| Observações | Não | Gerais |
| Observações de alerta | Não | Aparece em destaque no prontuário |

**Prontuário**

Abas: Visão Geral · Aplicações · Histórico · Evoluções · Medicamentos e Materiais · Lotes · Áreas  

Na **Visão Geral** há o painel **Gasto com insumos no mês** (substâncias, seringas, agulhas, total).

**Busca:** nome, CPF, telefone ou e-mail.

---

### 6.4 Protocolos

**Objetivo:** definir o “kit” da aplicação (substância + insumos).

1. **Protocolos → Novo Protocolo**  
2. Preencha nome, via, preço base (para cobrança).  
3. **Substâncias / Medicamentos** — adicione o produto e qtd padrão (ml).  
4. **Insumos do Atendimento**  
   - Seringa (3 / 5 / 10 ml se cadastradas com esse nome)  
   - Agulha  
   - Descartável (algodão, álcool…) — opcional  
5. Salve.  

**Alertas na lista**

- Badge **Completo** = tem seringa e agulha  
- Badge **Incompleto** = falta seringa e/ou agulha  
- Banner amarelo se houver protocolos incompletos  

Ao escolher o protocolo na aplicação, os itens vêm **pré-preenchidos** (ainda editáveis).

---

### 6.5 Aplicações (Procedimentos)

**Nova aplicação**

1. Selecione o paciente.  
2. Adicione uma ou mais aplicações (protocolo + área corporal + itens).  
3. Ajuste quantidades e lotes se necessário.  
4. **Resumo financeiro da sessão:** desconto, forma de pagamento, Pendente/Pago.  
5. **Salvar rascunho** ou **Finalizar**.  

**Ao finalizar**

- Baixa estoque (e lotes).  
- Gera **conta a receber** com o valor do checkout (`totalAmount`).  
- Se status = **Pago**, registra o recebimento automaticamente.  
- Forma de pagamento do checkout (PIX, cartão etc.) é mapeada para o financeiro.  

**Correção / cancelamento**

- Correção de itens com motivo (estorno parcial de estoque).  
- Cancelar finalizado: devolve estoque e cancela título **se ainda não houver pagamento**.  

---

### 6.6 Estoque

#### Itens

- Cadastro por tipo: medicamento, material, equipamento  
- Campos de **custo** e **preço de venda**  
- Estoque mínimo, lotes, validade  

#### Entrada de estoque

1. **Estoque → Nova Entrada** (ou atalho no dashboard).  
2. Item, quantidade, lote, validade, **custo unitário**.  
3. Opcional: gerar etiquetas.  

> Sem custo no lote/item, relatórios financeiros e Resumo do Mês mostram **quantidade**, mas **R$ zerado**.

#### Materiais recomendados (nomes)

Use nomes claros para o Resumo do Mês separar corretamente:

- `Seringa 3ml`  
- `Seringa 5ml`  
- `Seringa 10ml`  
- `Agulha 30G` (ou similar)  
- `Algodão`  
- `Álcool 70%`  

Categorias seed: Seringas, Agulhas, Descartáveis.

#### Outros

- **Medicamentos / Materiais / Equipamentos** — vistas filtradas  
- **Fornecedores** e **Locais** de estoque  
- **Ajuste de estoque** — perdas podem gerar conta a pagar (categoria Perdas)  
- **Transferência** entre locais  

---

### 6.7 Etiquetas

- Templates e impressão de etiquetas de lote  
- QR com prefixo `CESTQ:BATCH:`  
- Scanner para localizar lote  

---

### 6.8 Financeiro

#### Painel (`/financial`)

| KPI | Significado |
|-----|-------------|
| Receita total | Títulos a receber com vencimento no período |
| Entradas / saídas realizadas | Pagamentos de caixa no período |
| Saldo realizado | Entradas − saídas |
| Saldo projetado | Caixa + a receber em aberto − a pagar em aberto |
| Custo de insumos / margem | Base em procedimentos finalizados + custos de itens |
| Ticket médio | Receita de procedimentos ÷ nº de sessões |

#### Contas a receber

- Criar manualmente ou via finalização de aplicação  
- Registrar pagamento (parcial ou total)  
- Cancelar só se **não** houver pagamento  

#### Contas a pagar

- Criar manualmente  
- Pode vincular NF de entrada ainda sem título  
- Registrar pagamento  

#### Fluxo de caixa

- Realizado (pagamentos) + Previsto (saldos em aberto por vencimento)  
- Agrupar por dia / semana / mês  

#### Relatórios financeiros (DRE)

- Receita de procedimentos  
- (−) Custos de insumos  
- (−) Despesas **pagas** no período  
- = Resultado líquido  
- Export CSV: protocolos, pacientes, despesas  
- Listas de abertos e vencidos  

#### Categorias

- Receitas: procedimentos, consultas, etc.  
- Despesas: materiais, fornecedores, aluguel, perdas de estoque, etc.  

---

### 6.9 Resumo do Mês

**Menu:** Resumo do Mês  

| Seção | Conteúdo |
|-------|----------|
| Gasto total | Substâncias + materiais (R$) |
| Protocolos | Quantidade de aplicações com protocolo |
| Seringas | 3 ml · 5 ml · 10 ml · outro |
| Agulhas | Total |
| Algodão / Álcool | Totais |
| Detalhamento | Tabela item a item com custo |

Filtro: mês e ano.  
Dados vêm de **aplicações finalizadas** no período.

---

### 6.10 Central de Relatórios

1. Escolha o relatório na lateral.  
2. Configure filtros (período, paciente, categoria…).  
3. **Visualizar e Imprimir** (PDF).  
4. Ou **Exportar CSV**.  
5. Favoritos salvam combinações de filtros.  

**Grupos**

- Pacientes e prontuários  
- Estoque e consumo  
- Rastreabilidade e operação  

**Atalhos na lateral**

- Resumo do Mês  
- Lista de Compras Inteligente  

Atalhos de teclado (com relatório selecionado):

| Atalho | Ação |
|--------|------|
| Ctrl+Enter | Visualizar / imprimir |
| Ctrl+E | Exportar CSV |
| Ctrl+L | Limpar filtros |
| Ctrl+R | Atualizar dados |

---

### 6.11 Auditoria

- Log de ações (criação, edição, finalização, etc.)  
- Filtros por período / entidade  
- Detalhes do evento  

---

### 6.12 Configurações

- Nome da clínica / profissional  
- Alertas de validade  
- Bloqueio de itens vencidos  
- Integrações (ex.: Google Calendar / Apps Script, se habilitadas)  
- **Importar / Exportar** dados (CSV)  

---

### 6.13 Backup

- Gerar backup do banco local  
- Restaurar quando necessário  
- Mantenha cópia em pen drive / nuvem da clínica  

---

## 7. Cadastros iniciais recomendados

Ordem sugerida no **primeiro uso**:

1. **Configurações** — nome da clínica  
2. **Fornecedores** (se for usar compras)  
3. **Materiais** — seringas 3/5/10 ml, agulhas, algodão, álcool (com custo na entrada)  
4. **Medicamentos** — substâncias usadas  
5. **Protocolos** — cada um com substância + seringa + agulha + preço base  
6. **Pacientes** — conforme atendimento  
7. Primeira **aplicação** de teste e conferência no **Resumo do Mês**  

---

## 8. Checklist mensal da doutora

- [ ] Conferir **Resumo do Mês** (protocolos, seringas, agulhas, custo total)  
- [ ] Abrir **Financeiro** — recebimentos e contas em aberto  
- [ ] **Estoque baixo** e **vencimentos** (Dashboard / Relatórios)  
- [ ] Protocolos com badge **Incompleto** → completar insumos  
- [ ] Fazer **Backup**  
- [ ] Opcional: DRE e export CSV para contabilidade  

---

## 9. Relatório de testes (auditoria técnica)

**Data:** 2026-08-02  
**Ambiente:** repositório local `app` (Windows)  
**Tipo de teste:** verificação automatizada + auditoria estática de código e integrações  

> **Nota:** Não foi possível simular cliques na UI desktop (Tauri) nesta sessão.  
> Os testes cobrem **compilação, migrations, rotas, módulos e fluxos críticos no código**.  
> Validação visual final deve ser feita abrindo o app (`npm run tauri:dev`).

### 9.1 Resultados automatizados

| Teste | Comando | Resultado |
|-------|---------|-----------|
| Checksum de migrations | `npm run verify-migrations` | **PASSOU** — 28/28 SQL no manifesto SHA-384 |
| TypeScript | `npx tsc --noEmit` | **PASSOU** — zero erros |
| Build de produção | `npm run build` | **PASSOU** — Vite build ~28s, exit 0 |

**Aviso do build (não bloqueante):** alguns chunks > 500 kB (ex.: PDF). Recomendação futura: code-split mais agressivo.

### 9.2 Mapa de rotas

| # | Rota | Status no código |
|---|------|------------------|
| 1 | `/login` | OK — auth + redirect |
| 2 | `/dashboard` | OK |
| 3 | `/agenda` | OK + validação estoque |
| 4 | `/patients` | OK + CPF |
| 5 | `/patients/$patientId` | OK + custo mensal |
| 6 | `/procedures` | OK |
| 7 | `/procedures/new` | OK + checkout financeiro |
| 8 | `/procedures/execute/...` | OK |
| 9 | `/inventory` + entry/items | OK |
| 10 | `/medications` `/materials` `/equipment` | OK |
| 11 | `/labels` | OK |
| 12 | `/protocols` | OK + insumos + alertas |
| 13 | `/financial` + subrotas | OK (correções recentes) |
| 14 | `/resumo-mes` | OK |
| 15 | `/reports` + purchase-plan | OK |
| 16 | `/audit` `/settings` `/backup` | OK |

**Total:** 37 paths registrados no router, todos com páginas lazy-load.

### 9.3 Fluxos críticos (código)

| Fluxo | Veredito | Observação |
|-------|----------|------------|
| Login seed | OK | `ana@morong.med.br` / `Ana2026!` |
| Protocolo → pré-preenche itens na aplicação | OK | `ProcedureApplicationCard` |
| Finalizar → baixa estoque | OK | `finalizeProcedure` + movements |
| Finalizar → conta a receber | **OK (corrigido)** | Usa `totalAmount` + `markAsPaid` |
| Mapa pagamento PIX/cartão → financeiro | OK | Map `fin-pay-*` |
| Cancelar finalizado → estorno | OK | Bloqueia se título já pago |
| Custo insumos (lote → cost_price) | OK | Fallback no repositório financeiro |
| DRE despesas = pagamentos reais | OK | Não usa mais valor cheio do título |
| Resumo do mês / classificador seringas | OK | Por nome 3/5/10 ml |
| Perda de estoque → despesa | OK | Categoria `fin-cat-exp-losses` (migration 028) |
| Relatórios PDF | OK | Dados fora do PDF, build inclui chunk PDF |

### 9.4 Matriz por módulo

| Módulo | Compila | Integra | Risco residual |
|--------|---------|---------|----------------|
| Auth / sessão | Sim | Sim | — |
| Dashboard | Sim | Sim | — |
| Agenda | Sim | Sim | Depende de estoque preenchido |
| Pacientes | Sim | Sim | — |
| Protocolos | Sim | Sim | Precisa configurar insumos |
| Aplicações | Sim | Sim | Precisa preços/custos cadastrados |
| Estoque | Sim | Sim | Entrada não gera pagar automático |
| Etiquetas | Sim | Sim | Impressora física não testada aqui |
| Financeiro | Sim | Sim | Bases competência vs caixa (documentado) |
| Resumo do Mês | Sim | Sim | Depende de nomes de seringas |
| Relatórios | Sim | Sim | Chunk PDF grande |
| Auditoria | Sim | Sim | — |
| Settings / Import | Sim | Sim | CSV depende do arquivo do usuário |
| Backup | Sim | Sim | Caminho de disco no SO |
| Apps Script | Sim | Condicional | Só se integração habilitada |

### 9.5 Checklist de teste manual (para a equipe / doutora)

Use este checklist **no app aberto**:

#### A — Setup (uma vez)

- [ ] Login com usuário seed  
- [ ] Cadastrar Seringa 3ml, 5ml, 10ml, Agulha, Algodão com **custo**  
- [ ] Cadastrar 1 medicamento com custo  
- [ ] Criar protocolo com substância + seringa + agulha + preço base  
- [ ] Lista de protocolos mostra **Completo**  

#### B — Atendimento

- [ ] Cadastrar paciente com CPF  
- [ ] Nova aplicação → protocolo preenche itens  
- [ ] Finalizar com valor e **Pago**  
- [ ] Estoque diminuiu  
- [ ] Contas a receber: título **pago**  

#### C — Fechamento

- [ ] Resumo do Mês: seringas separadas + custo > 0  
- [ ] Painel financeiro: entradas e margem coerentes  
- [ ] Relatório PDF gera e imprime preview  
- [ ] Backup gera arquivo  

#### D — Casos de borda

- [ ] Finalizar sem preço base → aviso no checkout  
- [ ] Protocolo incompleto → alerta amarelo  
- [ ] Cancelar procedimento pago → deve **bloquear**  
- [ ] Cancelar procedimento só com título aberto → estorna estoque  

### 9.6 Resumo executivo dos testes

| Indicador | Valor |
|-----------|-------|
| Migrations íntegras | **28/28** |
| TypeScript | **0 erros** |
| Build produção | **Sucesso** |
| Rotas mapeadas | **37** |
| Módulos de feature | **22** |
| Bloqueadores críticos no código | **Nenhum após correções financeiras** |
| Teste UI E2E automatizado | **Não executado** (requer Tauri + operador) |

**Conclusão:** o sistema está **tecnicamente íntegro para build e uso**. Os fluxos principais estão implementados e as correções recentes (financeiro na finalização, DRE, Resumo do Mês, protocolos com insumos) estão no código.  
Recomenda-se a equipe percorrer o **checklist manual §9.5** uma vez em máquina real com impressora/etiquetas se for o caso de produção.

---

## 10. Limitações conhecidas

1. **Entrada de estoque** não cria conta a pagar sozinha (pode vincular NF manualmente em Contas a Pagar).  
2. **Estorno de pagamento** financeiro não existe — não cancela título já pago.  
3. Tabela `financial_cash_movements` existe no schema, mas o fluxo usa `financial_payments`.  
4. **Seringas** no Resumo do Mês dependem do **nome** do item (3ml / 5ml / 10ml).  
5. Custos e margens dependem de **custo cadastrado** nos lotes/itens.  
6. Bundle PDF do frontend é grande (performance de 1ª carga de relatórios).  
7. Integração Apps Script / e-mail depende de configuração externa.  

---

## 11. Solução de problemas

| Problema | O que fazer |
|----------|-------------|
| Não entra no sistema | Conferir e-mail/senha; reiniciar app; verificar se o SQLite iniciou |
| Finalizei e não apareceu no financeiro | Conferir se o total no checkout era > 0; reabrir Contas a Receber |
| Resumo do Mês com R$ 0 | Cadastrar custo na entrada de lote / item e refazer aplicações |
| Seringas todas em “Outro” | Renomear itens para incluir `3ml`, `5ml` ou `10ml` |
| Protocolo incompleto | Editar e preencher Insumos do Atendimento |
| Estoque insuficiente na finalização | Fazer entrada ou reduzir quantidade usada |
| Não cancela procedimento | Verificar se a conta a receber já tem pagamento |
| Build falha em migrations | Rodar `npm run verify-migrations` e não editar SQL antigos |

---

## 12. Glossário

| Termo | Significado |
|-------|-------------|
| **Protocolo** | Receita clínica padrão (itens + preço) |
| **Aplicação / Procedimento** | Sessão realizada em um paciente |
| **Insumos** | Seringa, agulha, algodão, álcool… |
| **Baixa de estoque** | Saída automática ao finalizar |
| **Conta a receber** | Valor cobrado do paciente |
| **CMV** | Custo dos materiais/medicamentos usados |
| **DRE** | Demonstração do resultado (simplificada) |
| **Resumo do Mês** | Visão simples de consumo e gasto mensal |

---

## Anexos

### A. Comandos úteis

```bash
npm run verify-migrations   # Integridade das migrations
npx tsc --noEmit            # Tipos
npm run build               # Build web
npm run tauri:dev           # App desktop em desenvolvimento
npm run tauri:build:windows # Instalador Windows
```

### B. Arquivos de referência no projeto

| Arquivo | Conteúdo |
|---------|----------|
| `COMECE_AQUI_MAC.md` | Instalação Mac |
| `onboarding.md` | Onboarding |
| `MANUAL_COMPLETO_SISTEMA.md` | Este manual |
| `src/lib/db/migrations/` | Schema e seeds |
| `src/app/router.tsx` | Todas as rotas |

### C. Identidade visual

- Verde profundo: `#1A5347`  
- Bege: `#F7F4EE`  
- Marrom texto: `#5C4033` / `#4A3328`  
- Dourado destaque: `#D4AF37`  

---

**Fim do manual.**  
Para dúvidas operacionais, percorra o fluxo da seção 5 e o checklist 9.5 com a doutora na primeira semana de uso.
