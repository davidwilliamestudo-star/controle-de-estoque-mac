# Prompts — Funcionalidades Premium para o Controle de Estoque — Dra. Ana Morong

Este arquivo reúne prompts objetivos para uma IA de desenvolvimento implementar e aprimorar funcionalidades premium no sistema **Controle de Estoque — Dra. Ana Morong**.

## Diretrizes globais para todos os prompts

Antes de executar qualquer prompt, a IA deve respeitar estas regras:

- Não criar mock para substituir dados reais.
- Não apagar dados reais.
- Não refazer o sistema do zero.
- Não alterar visual principal sem necessidade.
- Não quebrar estoque, pacientes, prontuário, aplicações, protocolos, agenda, relatórios ou integrações.
- Manter arquitetura: **UI → Service → Repository → SQLite**.
- Nenhuma tela deve acessar SQLite diretamente.
- Tudo deve funcionar local/offline.
- Se a funcionalidade já existir, **aprimorar** em vez de duplicar.
- Se a funcionalidade não existir, implementar de forma compatível com a arquitetura atual.
- Toda ação crítica deve registrar auditoria.
- Ao final de cada implementação, rodar:
  - `npm.cmd exec tsc -- --noEmit`
  - `npm.cmd run build`

---

# PROMPT 1 — Lista de Compras Automática

Implemente ou aprimore a funcionalidade de **Lista de Compras Automática** no módulo de Estoque e no painel de Relatórios.

Objetivo:
Gerar automaticamente uma lista de reposição de estoque com base em estoque atual, estoque mínimo, estoque reservado, consumo previsto, lotes vencendo/vencidos e fornecedores padrão.

A funcionalidade deve calcular:

- estoque atual;
- estoque reservado;
- estoque disponível;
- estoque mínimo;
- consumo previsto por aplicações agendadas;
- quantidade sugerida para compra;
- valor unitário de compra;
- custo total estimado;
- fornecedor padrão;
- motivo da compra sugerida.

Motivos possíveis:

- abaixo do estoque mínimo;
- estoque disponível abaixo do mínimo;
- aplicações futuras sem saldo suficiente;
- lote vencendo;
- lote vencido;
- consumo previsto alto;
- item crítico sem fornecedor.

Regras:

- Não alterar baixa de estoque.
- Não criar compra automaticamente.
- Apenas gerar recomendação de compra.
- Permitir impressão e exportação, se o sistema já possuir estrutura.
- Considerar medicamentos, materiais e, se fizer sentido, equipamentos.
- Se item não tiver preço cadastrado, mostrar “Preço não informado”.
- Se item não tiver fornecedor, mostrar “Fornecedor não definido”.

Criar ou aprimorar:

- `purchasePlanning.service.ts`
- `purchasePlanning.repository.ts`
- tela/seção “Lista de Compras”
- card no Estoque
- relatório em Relatórios

Critérios de aceite:

1. O sistema gera lista de compra com dados reais.
2. A lista considera estoque atual, reservado e disponível.
3. A lista calcula custo estimado.
4. A lista mostra fornecedor padrão.
5. A lista explica o motivo da sugestão.
6. Permite impressão/visualização.
7. Typecheck e build passam.

---

# PROMPT 2 — Previsão de Duração do Estoque

Implemente ou aprimore a funcionalidade de **Previsão de Duração do Estoque**.

Objetivo:
Mostrar quanto tempo cada item do estoque deve durar com base em consumo histórico, aplicações agendadas e estoque disponível.

O sistema deve calcular:

- consumo médio diário/semanal/mensal;
- consumo previsto com base em agenda;
- estoque disponível;
- dias estimados até acabar;
- status de risco: baixo, médio, alto ou crítico;
- data provável de falta.

Exemplo de mensagem:

> Este item pode acabar em aproximadamente 12 dias considerando o consumo atual e as aplicações agendadas.

Regras:

- Se não houver histórico suficiente, mostrar “Histórico insuficiente”.
- Não inventar consumo.
- Separar consumo real de consumo previsto.
- Considerar apenas movimentações reais do estoque.
- Considerar reservas futuras quando existirem.
- Não bloquear uso do estoque, apenas alertar.

Criar ou aprimorar:

- `stockForecast.service.ts`
- `getDaysUntilStockout(itemId)`
- `getStockRiskLevel(itemId)`
- indicadores no item de estoque
- card no dashboard
- relatório de previsão

Critérios de aceite:

1. O sistema calcula previsão com dados reais.
2. Mostra dias até possível falta.
3. Mostra risco por item.
4. Considera reservas e aplicações futuras.
5. Não inventa previsão sem dados.
6. Typecheck e build passam.

---

# PROMPT 3 — Painel Financeiro do Estoque

Implemente ou aprimore o **Painel Financeiro do Estoque**.

Objetivo:
Transformar o estoque em uma visão financeira, mostrando valor parado, custo consumido, perdas por vencimento e custo de reposição.

O painel deve mostrar:

- valor total em estoque;
- valor por categoria;
- valor por tipo: medicamento, material, equipamento;
- custo consumido por período;
- custo consumido por protocolo;
- custo consumido por paciente, quando aplicável;
- perdas estimadas por vencimento;
- custo estimado de reposição;
- itens sem preço cadastrado.

Regras:

- Usar valores financeiros já cadastrados nos itens.
- Se não houver preço, não inventar.
- Mostrar alertas para itens sem valor de compra.
- Valores devem ser exibidos em Real brasileiro.
- Não alterar movimentações de estoque.
- Não alterar regras financeiras fora do estoque.

Criar ou aprimorar:

- `inventoryFinancial.service.ts`
- `inventoryFinancial.repository.ts`
- painel em Estoque
- seção em Relatórios
- cards financeiros
- relatório imprimível

Critérios de aceite:

1. Mostra valor total do estoque.
2. Mostra custo consumido por período.
3. Mostra custo de reposição.
4. Identifica itens sem preço.
5. Exibe valores em BRL.
6. Typecheck e build passam.

---

# PROMPT 4 — Custo Real por Aplicação e Protocolo

Implemente ou aprimore a funcionalidade de **Custo Real por Aplicação/Procedimento**.

Objetivo:
Cada aplicação finalizada deve mostrar o custo real dos medicamentos e materiais usados, com base nos itens, quantidades, lotes e valores cadastrados no estoque.

A aplicação deve exibir:

- medicamentos usados;
- materiais usados;
- lote utilizado;
- quantidade usada;
- custo unitário;
- custo total por item;
- custo total do procedimento;
- custo agrupado por medicamento/material;
- protocolo relacionado;
- margem estimada, se houver preço de venda ou valor do procedimento.

Regras:

- Custo real deve usar os itens efetivamente baixados do estoque.
- Se item não tiver preço, mostrar “Preço não informado”.
- Correções de aplicação devem recalcular custo.
- Não criar baixa duplicada.
- Não alterar histórico sem auditoria.
- O prontuário deve exibir o custo apenas em área interna, não em relatório para paciente, salvo se houver opção explícita.

Criar ou aprimorar:

- `procedureCost.service.ts`
- `procedureCost.repository.ts`
- seção de custo no procedimento
- seção de custo no histórico do paciente
- relatório interno de custo por procedimento/protocolo

Critérios de aceite:

1. Procedimento finalizado mostra custo real.
2. Correção de procedimento recalcula custo.
3. Custo usa movimentações reais.
4. Itens sem preço ficam sinalizados.
5. Typecheck e build passam.

---

# PROMPT 5 — Agenda com Validação de Estoque Antes de Confirmar

Implemente ou aprimore a **validação de estoque na agenda** antes de confirmar uma aplicação.

Objetivo:
Ao agendar uma aplicação, o sistema deve verificar se há estoque suficiente para o protocolo escolhido e avisar antes da confirmação.

No formulário de agendamento, ao selecionar paciente + protocolo + data, mostrar:

- itens necessários;
- quantidade necessária;
- estoque atual;
- estoque reservado;
- estoque disponível;
- lote sugerido;
- validade do lote;
- status: suficiente, atenção ou insuficiente.

Regras:

- Agendar não deve baixar estoque.
- Agendar pode reservar estoque, se o módulo de reserva já existir.
- Se não existir reserva, apenas validar e alertar.
- Se faltar estoque, permitir salvar como pendente somente se a regra atual permitir.
- Nunca permitir que a finalização do procedimento gere estoque negativo.
- Recalcular validação ao trocar protocolo, data ou itens.

Criar ou aprimorar:

- `appointmentStockValidation.service.ts`
- painel de conferência no formulário de agenda
- alertas visuais
- status de aplicação com pendência de estoque

Critérios de aceite:

1. Agenda valida estoque antes de confirmar.
2. Mostra itens suficientes e insuficientes.
3. Não baixa estoque no agendamento.
4. Considera reservas quando existirem.
5. Gera alerta claro para falta.
6. Typecheck e build passam.

---

# PROMPT 6 — Relatório Visual do Paciente

Implemente ou aprimore o **Relatório Visual do Paciente**.

Objetivo:
Criar um relatório bonito, profissional e imprimível com dados selecionáveis do paciente e seus procedimentos, sem expor informações internas indevidas.

O relatório deve permitir selecionar:

- dados básicos do paciente;
- período;
- aplicações realizadas;
- protocolos;
- evolução;
- áreas corporais;
- medicamentos e materiais usados;
- lotes e validade, se for relatório interno;
- intercorrências;
- observações;
- mapa corporal, se disponível;
- assinatura/rodapé da clínica.

Tipos de relatório:

1. Interno — completo, para a clínica.
2. Paciente — resumido, sem custos, sem estoque interno e sem auditoria.

Regras:

- Não mostrar custo para paciente, salvo opção explícita.
- Não mostrar auditoria interna.
- Não mostrar estoque total da clínica.
- Permitir pré-visualização antes de imprimir/enviar.
- Usar dados reais do prontuário.
- Se algum dado estiver ausente, mostrar estado vazio elegante.

Criar ou aprimorar:

- `patientVisualReport.service.ts`
- `PatientReportPreviewModal`
- layout A4 print
- botão no prontuário
- botão em Relatórios

Critérios de aceite:

1. Relatório usa dados reais.
2. Possui modo interno e modo paciente.
3. Permite preview.
4. Permite imprimir/gerar PDF se já houver estrutura.
5. Não expõe dados internos no modo paciente.
6. Typecheck e build passam.

---

# PROMPT 7 — Etiquetas Inteligentes com QR Code

Implemente ou aprimore as **Etiquetas Inteligentes com QR Code**.

Objetivo:
Permitir gerar etiquetas para itens, lotes, validade, fracionamento e conferência clínica, com QR Code vinculado ao sistema.

Tipos de etiqueta:

- etiqueta de lote;
- etiqueta de item;
- etiqueta de validade próxima;
- etiqueta de item fracionado;
- etiqueta de seringa/preparo, se fizer sentido;
- etiqueta de conferência para aplicação.

A etiqueta deve poder mostrar:

- nome do item;
- tipo;
- lote;
- validade;
- unidade;
- quantidade;
- QR Code;
- data de impressão;
- nome da clínica, se configurado.

QR Code:

- Não deve conter dados sensíveis.
- Usar payload interno, por exemplo:
  - `CESTQ:ITEM:{inventory_item_id}`
  - `CESTQ:BATCH:{inventory_batch_id}`
  - `CESTQ:PREP:{preparation_id}`, se existir.

Regras:

- QR Code deve abrir ou localizar o item/lote dentro do sistema, se houver leitor futuramente.
- Não expor paciente no QR Code.
- Não expor custo no QR Code.
- Permitir preview antes de imprimir.
- Preservar modelos já existentes, se houver.

Criar ou aprimorar:

- `labelTemplates`
- `labelPrinting.service.ts`
- tela de etiquetas
- templates Pimaco e modelo pequeno
- preview de impressão

Critérios de aceite:

1. Gera etiqueta por item/lote.
2. QR Code usa payload interno seguro.
3. Preview funciona.
4. Impressão usa layout correto.
5. Não expõe dados sensíveis.
6. Typecheck e build passam.

---

# PROMPT 8 — Importação Inteligente de XML da Nota Fiscal

Implemente ou aprimore a **Importação Inteligente de XML da Nota Fiscal** para entrada de estoque.

Objetivo:
Permitir importar produtos de XML de nota fiscal, revisar os dados, vincular produtos a itens existentes e criar entradas de estoque com lote, validade, quantidade e custo.

Fluxo:

1. Selecionar arquivo XML.
2. Ler produtos da nota.
3. Mostrar prévia.
4. Sugerir vínculo com item existente.
5. Permitir criar item novo, se necessário.
6. Permitir ajustar categoria, fornecedor, unidade, lote, validade e quantidade.
7. Calcular custo unitário.
8. Revisar antes de salvar.
9. Aplicar entrada de estoque.
10. Registrar auditoria.

Regras:

- Nunca salvar automaticamente sem revisão.
- Não duplicar itens sem confirmação.
- Não sobrescrever item existente sem confirmação.
- Se lote já existir, sugerir atualização.
- Se item não existir, permitir criação guiada.
- Criar movimentação de entrada.
- Atualizar estoque atual.
- Rodar em transação.
- Se falhar, rollback.

Criar ou aprimorar:

- `xmlImport.service.ts`
- `xmlImport.repository.ts`
- `XmlImportWizard`
- tela de revisão
- vínculo item XML → item estoque
- relatório final da importação

Critérios de aceite:

1. Importa XML real.
2. Mostra produtos antes de salvar.
3. Permite vincular/criar item.
4. Permite informar lote/validade.
5. Atualiza estoque e movimentações.
6. Registra auditoria.
7. Typecheck e build passam.

---

# PROMPT 9 — Biblioteca de Fornecedores

Implemente ou aprimore a **Biblioteca de Fornecedores**.

Objetivo:
Transformar fornecedores em um módulo útil para compras, estoque e relatórios, e não apenas um campo simples.

Cada fornecedor deve ter:

- nome;
- CNPJ/CPF opcional;
- telefone;
- e-mail;
- contato responsável;
- endereço opcional;
- itens fornecidos;
- último preço pago por item;
- prazo médio de entrega;
- histórico de compras/importações;
- status: ativo/inativo;
- observações.

Funcionalidades:

- criar fornecedor;
- editar fornecedor;
- inativar fornecedor;
- excluir apenas se não estiver em uso;
- vincular fornecedor a item;
- vincular fornecedor a lote/compra;
- visualizar itens fornecidos;
- visualizar histórico de preços;
- sugerir fornecedor no relatório de compra.

Regras:

- Se fornecedor estiver em uso, não excluir fisicamente.
- Usar soft delete/inativação.
- Registrar auditoria.
- Não quebrar formulários atuais de estoque.
- Permitir criar fornecedor rapidamente dentro do formulário de item.

Criar ou aprimorar:

- `suppliers.repository.ts`
- `suppliers.service.ts`
- tela de fornecedores
- modal de fornecedor rápido
- integração com lista de compras
- integração com importação XML

Critérios de aceite:

1. Fornecedor pode ser gerenciado.
2. Fornecedor aparece nos itens.
3. Fornecedor aparece na lista de compra.
4. Histórico de compras/preços aparece quando houver dados.
5. Registros em uso não são excluídos fisicamente.
6. Typecheck e build passam.

---

# PROMPT 10 — Modelos de Evolução por Protocolo

Implemente ou aprimore os **Modelos de Evolução por Protocolo**.

Objetivo:
Permitir que a clínica crie modelos de evolução automática por protocolo, usando variáveis reais do sistema.

Cada modelo deve permitir:

- nome do modelo;
- protocolo vinculado;
- texto padrão;
- variáveis automáticas;
- status ativo/inativo;
- pré-visualização;
- edição;
- duplicação;
- versão ou histórico simples, se já houver estrutura.

Variáveis suportadas:

- `{{paciente_nome}}`
- `{{data_procedimento}}`
- `{{protocolo_nome}}`
- `{{via_aplicacao}}`
- `{{area_corporal}}`
- `{{medicamentos}}`
- `{{materiais}}`
- `{{lotes}}`
- `{{validade_lotes}}`
- `{{intercorrencia}}`
- `{{observacoes}}`
- `{{profissional}}`

Regras:

- Não gerar evolução com dados fictícios.
- Se variável não tiver dado, mostrar fallback seguro.
- Permitir editar evolução antes de finalizar.
- Não substituir evolução manual sem confirmação.
- Ao corrigir aplicação, permitir regenerar evolução com dados corrigidos.
- Registrar auditoria ao criar/editar modelo.

Criar ou aprimorar:

- `evolutionTemplates.repository.ts`
- `evolutionTemplates.service.ts`
- editor de modelo
- preview com dados reais ou exemplo seguro
- seletor de modelo no protocolo
- integração com finalização da aplicação

Critérios de aceite:

1. Modelos podem ser criados por protocolo.
2. Variáveis são resolvidas com dados reais.
3. Evolução pode ser editada antes de salvar.
4. Correção de aplicação pode regenerar evolução.
5. Auditoria registra alterações.
6. Typecheck e build passam.

---

# PROMPT 11 — Assinatura VoltQ Discreta e Tela Sobre

Implemente uma assinatura discreta da **VoltQ** dentro do sistema, sem atrapalhar a experiência da clínica.

Objetivo:
Reforçar a autoria da agência e deixar o sistema com aparência de produto profissional mantido.

Criar uma tela ou seção “Sobre o Sistema” em Configurações.

Conteúdo:

- nome do sistema: Controle de Estoque — Dra. Ana Morong;
- desenvolvido por VoltQ;
- versão do sistema;
- data da build, se disponível;
- módulos ativos;
- ambiente: local/offline;
- contato de suporte, se configurado;
- link ou texto institucional curto da VoltQ;
- botão “Rever Intro VoltQ”;
- botão “Rever Onboarding”;
- botão “Ver changelog”, se existir.

Direção visual:

- discreta;
- premium;
- limpa;
- sem parecer propaganda invasiva;
- assinatura de estúdio/desenvolvedor;
- usar logo VoltQ se já estiver no projeto.

Texto sugerido:

> Desenvolvido por VoltQ — tecnologia, design e operação para experiências digitais sob medida.

Regras:

- Não colocar assinatura em telas clínicas sensíveis.
- Não interferir em relatórios para paciente, salvo rodapé opcional interno.
- Não prejudicar usabilidade.
- Não depender de internet.
- Não quebrar Configurações.

Criar ou aprimorar:

- seção “Sobre”
- seção “Experiência VoltQ”
- exibição de versão/build
- atalhos para rever intro/onboarding

Critérios de aceite:

1. Existe tela/seção Sobre.
2. Mostra autoria VoltQ de forma discreta.
3. Mostra versão do sistema.
4. Permite rever intro/onboarding.
5. Não interfere em fluxos clínicos.
6. Typecheck e build passam.

---

# Ordem recomendada de implementação

Para reduzir risco, implemente nesta ordem:

1. **Biblioteca de Fornecedores**
2. **Valores financeiros e Painel Financeiro do Estoque**
3. **Lista de Compras Automática**
4. **Previsão de Duração do Estoque**
5. **Agenda com Validação de Estoque**
6. **Custo Real por Aplicação**
7. **Modelos de Evolução por Protocolo**
8. **Relatório Visual do Paciente**
9. **Etiquetas Inteligentes**
10. **Importação XML**
11. **Assinatura VoltQ / Sobre**

Motivo:
Fornecedores, valores financeiros e previsão de estoque são base para lista de compras, relatórios e custo por aplicação. Importação XML e etiquetas ficam mais seguras depois que a base de estoque estiver consolidada.

---

# Prompt mestre para iniciar a implementação em fases

Você deve implementar as funcionalidades premium listadas neste arquivo no sistema “Controle de Estoque — Dra. Ana Morong”.

Antes de alterar qualquer coisa:

1. Leia o README do projeto.
2. Analise o schema real do SQLite.
3. Analise services/repositories existentes.
4. Verifique quais funcionalidades já existem.
5. Para funcionalidades existentes, aprimore sem duplicar.
6. Para funcionalidades ausentes, implemente respeitando a arquitetura atual.

Regras:

- Não criar mock.
- Não apagar dados.
- Não refazer o sistema do zero.
- Manter UI → Service → Repository → SQLite.
- Usar transações em operações críticas.
- Registrar auditoria em ações sensíveis.
- Rodar typecheck/build ao final de cada fase.
- Não avançar se a fase anterior quebrar.

Ao final de cada fase, informe:

- fase concluída;
- diagnóstico;
- arquivos criados;
- arquivos alterados;
- migrations criadas;
- services criados/ajustados;
- repositories criados/ajustados;
- telas criadas/ajustadas;
- como testar;
- resultado do typecheck;
- resultado do build.
