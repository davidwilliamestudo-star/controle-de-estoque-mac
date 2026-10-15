// src/services/contracts/saude360ContractEngine.service.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type Saude360PlanId =
  | 'MAPA_360'
  | 'RESTART_3M'
  | 'EVOLUTION_6M'
  | 'SIGNATURE_12M'
  | 'LIFE_ANUAL'
  | 'PERSONALIZADO';

export type PricingTierMode =
  | 'IDEAL_AVISTA'
  | 'IDEAL_12X'
  | 'MINIMO_AVISTA'
  | 'MINIMO_12X'
  | 'CUSTOM';

export type PaymentModality = 'AVISTA' | 'CARTAO' | 'PIX_PARCELADO';

export interface Saude360PlanMetadata {
  id: Saude360PlanId;
  name: string;
  subtitle: string;
  durationLabel: string;
  consultationsSchedule: string;
  stagesSummary: string[];
  clinicalObjectives: string;
  includesSummary: string;
  pricing: {
    idealCash: number;
    idealInstallment12x: number;
    idealTotal12x: number;
    minCash: number;
    minInstallment12x: number;
    minTotal12x: number;
  };
}

/**
 * Catálogo Oficial extraído do Notebook "Saúde 360 Signature: A Jornada da Longevidade Integrada"
 */
export const SAUDE_360_CATALOG: Record<Saude360PlanId, Saude360PlanMetadata> = {
  MAPA_360: {
    id: 'MAPA_360',
    name: 'Mapa da Saúde 360®',
    subtitle: 'Experiência Diagnóstica (90 min + Reunião de Entrega)',
    durationLabel: 'Avaliação diagnóstica completa',
    consultationsSchedule: 'Consulta inicial presencial (90 min) + Reunião Médica de Entrega',
    stagesSummary: [
      'Etapa 1: Investigação de 90 min (Metabolismo, Hormônios, Intestino, Inflamação, Bioimpedância e Estilo de Vida)',
      'Etapa 2: Reunião de Apresentação do Mapa da Saúde e direcionamento terapêutico',
    ],
    clinicalObjectives:
      'Compreender a verdadeira origem dos sintomas de forma integrada e individualizada.',
    includesSummary:
      'Avaliação de composição corporal por bioimpedância médica, requisição individualizada de exames e Reunião de Entrega.',
    pricing: {
      idealCash: 1500.0,
      idealInstallment12x: 140.0,
      idealTotal12x: 1680.0,
      minCash: 900.0,
      minInstallment12x: 84.0,
      minTotal12x: 1008.0,
    },
  },
  RESTART_3M: {
    id: 'RESTART_3M',
    name: 'Saúde 360® Restart',
    subtitle: 'Programa de 3 Meses (Consultas a cada 30 dias)',
    durationLabel: '3 (três) meses corridos',
    consultationsSchedule: '3 (três) consultas médicas (1 a cada 30 dias)',
    stagesSummary: [
      'Etapa 1 (0 a 30 dias): Organização Biológica (redução inflamatória e saúde intestinal)',
      'Etapa 2 (30 a 60 dias): Reequilíbrio Metabólico e Hormonal (energia e clareza mental)',
      'Etapa 3 (60 a 90 dias): Consolidação dos Primeiros Resultados',
    ],
    clinicalObjectives:
      'Organização biológica inicial, redução da inflamação celular, reorganização intestinal e reequilíbrio metabólico.',
    includesSummary:
      'Consulta inicial de apresentação do plano, 3 consultas médicas, bioimpedâncias periódicas e acompanhamento contínuo da equipe.',
    pricing: {
      idealCash: 5900.0,
      idealInstallment12x: 551.0,
      idealTotal12x: 6608.0,
      minCash: 3900.0,
      minInstallment12x: 364.0,
      minTotal12x: 4368.0,
    },
  },
  EVOLUTION_6M: {
    id: 'EVOLUTION_6M',
    name: 'Saúde 360® Evolution',
    subtitle: 'Programa Principal de 6 Meses (Consultas a cada 45 dias)',
    durationLabel: '6 (seis) meses corridos',
    consultationsSchedule: 'Consultas médicas periódicas a cada 45 (quarenta e cinco) dias',
    stagesSummary: [
      'Etapa 1 (0 a 45 dias): Reconstrução Metabólica e função mitocondrial',
      'Etapa 2 (45 a 90 dias): Reequilíbrio Hormonal individualizado',
      'Etapa 3 (90 a 135 dias): Performance Física, Mental e Recuperação Celular',
      'Etapa 4 (135 a 180 dias): Consolidação da Saúde e prevenção de recaídas',
    ],
    clinicalObjectives:
      'Reconstrução metabólica profunda, reequilíbrio hormonal personalizado, otimização mitocondrial e recuperação de performance.',
    includesSummary:
      'Consultas a cada 45 dias, reavaliações clínicas, monitoramento de exames, bioimpedâncias de evolução e acompanhamento contínuo.',
    pricing: {
      idealCash: 11900.0,
      idealInstallment12x: 1111.0,
      idealTotal12x: 13328.0,
      minCash: 8900.0,
      minInstallment12x: 831.0,
      minTotal12x: 9968.0,
    },
  },
  SIGNATURE_12M: {
    id: 'SIGNATURE_12M',
    name: 'Saúde 360® Signature',
    subtitle: 'Programa Premium de 12 Meses (Consultas a cada 60 dias)',
    durationLabel: '12 (doze) meses corridos',
    consultationsSchedule: '6 (seis) consultas médicas ao longo do ano (a cada 60 dias)',
    stagesSummary: [
      'Etapa 1 (0 a 60 dias): Organização Biológica',
      'Etapa 2 (60 a 120 dias): Reconstrução Metabólica',
      'Etapa 3 (120 a 180 dias): Equilíbrio Hormonal',
      'Etapa 4 (180 a 240 dias): Performance e Vitalidade',
      'Etapa 5 (240 a 300 dias): Longevidade e Prevenção',
      'Etapa 6 (300 a 360 dias): Consolidação e Continuidade',
    ],
    clinicalObjectives:
      'Transformação definitiva da saúde em 6 etapas com foco em prevenção, longevidade, massa muscular e autonomia.',
    includesSummary:
      '6 consultas médicas anuais, planejamento anual de Medicina de Precisão, bioimpedâncias em todas as etapas e painéis de longevidade.',
    pricing: {
      idealCash: 21900.0,
      idealInstallment12x: 2044.0,
      idealTotal12x: 24528.0,
      minCash: 15900.0,
      minInstallment12x: 1484.0,
      minTotal12x: 17808.0,
    },
  },
  LIFE_ANUAL: {
    id: 'LIFE_ANUAL',
    name: 'Saúde 360® Life',
    subtitle: 'Assinatura Anual de Longevidade (Consultas a cada 90 dias)',
    durationLabel: '12 (doze) meses (Assinatura com ciclo anual renovável)',
    consultationsSchedule: '4 (quatro) consultas médicas ao ano (a cada 90 dias)',
    stagesSummary: [
      'Etapa 1 (0 a 90 dias): Monitoramento da Saúde e estabilidade clínica',
      'Etapa 2 (90 a 180 dias): Prevenção e Ajustes precoces',
      'Etapa 3 (180 a 270 dias): Longevidade Ativa (massa muscular e cognição)',
      'Etapa 4 (270 a 360 dias): Renovação da Jornada e planejamento anual',
    ],
    clinicalObjectives:
      'Manutenção contínua, prevenção ativa de doenças crônicas, longevidade com autonomia e preservação de resultados.',
    includesSummary:
      '4 consultas médicas ao ano, acompanhamento preventivo contínuo, revisão de biomarcadores e ajustes terapêuticos.',
    pricing: {
      idealCash: 10900.0,
      idealInstallment12x: 1017.0,
      idealTotal12x: 12208.0,
      minCash: 7900.0,
      minInstallment12x: 737.0,
      minTotal12x: 8848.0,
    },
  },
  PERSONALIZADO: {
    id: 'PERSONALIZADO',
    name: 'Programa Personalizado / Protocolo Semanal',
    subtitle: 'Configuração Clínica Sob Medida / Aditivo',
    durationLabel: '12 (doze) semanas corridas',
    consultationsSchedule: 'Consultas de seguimento programadas a cada 30 dias',
    stagesSummary: [
      'Protocolo individualizado com acompanhamento semanal (WhatsApp / Check-in) e avaliações periódicas em consultório.',
    ],
    clinicalObjectives:
      'Protocolo terapêutico personalizado conforme avaliação médica e necessidades metabólicas individuais.',
    includesSummary:
      'Aplicações intramusculares / acompanhamento semanal e reavaliações médicas programadas.',
    pricing: {
      idealCash: 4500.0,
      idealInstallment12x: 420.0,
      idealTotal12x: 5040.0,
      minCash: 2500.0,
      minInstallment12x: 235.0,
      minTotal12x: 2820.0,
    },
  },
};

/**
 * Texto Integral do MODELO CONTRATO FINANCEIRO DRA ANA (3).docx
 */
export const OFFICIAL_CONTRACT_MODEL_3_TEXT = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS E ACOMPANHAMENTO EM SAÚDE

I – DAS PARTES

CONTRATADA:
Razão Social / Nome: Dra. Ana Carla Morong
CNPJ: 54.811.772/0001-32
Endereço Profissional: Tv. do Motorista, nº 82, Canto, Florianópolis - SC, CEP: 88075-550
Telefone / WhatsApp: (48) 98857-2882
E-mail: financeiro@draanamorong.com.br

CONTRATANTE (PACIENTE):
Nome Completo: {{nome}}
CPF nº: {{cpf}}
Data de Nascimento: {{data_nascimento}}
Endereço Residencial: {{endereco}}
Bairro / Cidade / UF: {{bairro_cidade_uf}}   |   CEP: {{cep}}
Telefone / WhatsApp: {{telefone}}   |   E-mail: {{email}}

II – DO OBJETO E DA ESCOLHA DO PROGRAMA

2.1. O presente contrato tem por objeto a prestação de serviços médicos individualizados em Medicina de Precisão e acompanhamento clínico integrativo pela CONTRATADA, estruturados na metodologia da Jornada Saúde 360®, mediante a escolha de um dos programas discriminados a seguir:

[{{chk_mapa}}] MAPA DA SAÚDE 360® (Experiência Diagnóstica)
Duração: Avaliação diagnóstica completa.
Escopo: Investigação aprofundada dos pilares de Metabolismo, Saúde Hormonal, Saúde Intestinal, Processos Inflamatórios e Estilo de Vida (consulta presencial de aproximadamente 90 minutos).
Inclui: Avaliação de composição corporal por bioimpedância médica, requisição individualizada de exames laboratoriais e complementares, e Reunião Médica de Apresentação e Entrega do Mapa da Saúde com direcionamento para a etapa seguinte.

[{{chk_restart}}] SAÚDE 360® RESTART (Programa de 3 Meses)
Duração: 3 (três) meses corridos a contar da adesão.
Consultas Médicas: 3 (três) consultas médicas presenciais ou teleconsultas programadas a cada 30 (trinta) dias.
Foco Clínico: Organização biológica inicial, redução da inflamação celular, reorganização da saúde intestinal e reequilíbrio metabólico.
Inclui: Consulta inicial de apresentação do plano, bioimpedâncias médicas periódicas e canal de acompanhamento contínuo da equipe.

[{{chk_evolution}}] SAÚDE 360® EVOLUTION (Programa de 6 Meses)
Duração: 6 (seis) meses corridos a contar da adesão.
Consultas Médicas: Consultas médicas periódicas agendadas com intervalo aproximado a cada 45 (quarenta e cinco) dias.
Foco Clínico: Reconstrução metabólica profunda, reequilíbrio hormonal personalizado, otimização mitocondrial, recuperação da performance física e mental e consolidação sustentável da saúde.
Inclui: Reavaliações clínicas periódicas, monitoramento de exames laboratoriais, bioimpedâncias de evolução e acompanhamento contínuo da equipe médica.

[{{chk_signature}}] SAÚDE 360® SIGNATURE (Programa de 12 Meses)
Duração: 12 (doze) meses corridos a contar da adesão.
Consultas Médicas: 6 (seis) consultas médicas de acompanhamento ao longo do ano, com periodicidade programada a cada 60 (sessenta) dias.
Foco Clínico: Jornada integrada em 6 etapas (Organização Biológica, Reconstrução Metabólica, Equilíbrio Hormonal, Performance e Vitalidade, Longevidade e Prevenção, e Consolidação e Continuidade).
Inclui: Planejamento anual completo baseado em Medicina de Precisão, bioimpedâncias médicas em todas as etapas, solicitações e reinterpretações contínuas de painéis laboratoriais e monitoramento de marcadores de longevidade.

[{{chk_life}}] SAÚDE 360® LIFE (Programa de Assinatura Anual de Longevidade)
Duração: Assinatura com ciclo anual renovável.
Consultas Médicas: 4 (quatro) consultas médicas ao ano, com periodicidade programada a cada 90 (noventa) dias.
Foco Clínico: Manutenção contínua, prevenção ativa de doenças crônicas, longevidade com autonomia e preservação dos resultados alcançados nas fases anteriores.
Inclui: Acompanhamento preventivo contínuo, revisão periódica de biomarcadores e ajustes terapêuticos de manutenção.

[{{chk_personalizado}}] PROGRAMA PERSONALIZADO / PROTOCOLO CLÍNICO SEMANAL
Duração: {{semanas_tratamento}} ({{duracao_personalizada}}).
Número total / Seguimento de consultas médicas: {{consulta_seg}}.
Frequência e procedimentos complementares em consultório: {{frequencia_procedimentos}}.
Especificações terapêuticas: {{especificacoes_terapeuticas}}.

2.2. Diretrizes Técnicas e Inexistência de Soroterapia:
Fica expressamente consignado que a CONTRATADA não realiza e este contrato não contempla procedimentos de soroterapia, infusões endovenosas ou quaisquer terapias de administração parenteral por via endovenosa.
As prescrições médicas emitidas pela CONTRATADA (incluindo reposições hormonais individualizadas, nutracêuticos, medicações orais ou aplicações intramusculares em consultório, quando estritamente indicadas) observarão as normas técnicas do Conselho Federal de Medicina (CFM) e da ANVISA, sendo precedidas de criteriosa avaliação clínica e do respectivo Termo de Consentimento Livre e Esclarecido.

III – DO VALOR E DAS CONDIÇÕES DE PAGAMENTO

3.1. Em contraprestação aos serviços médicos acordados na Cláusula II, o(a) CONTRATANTE pagará à CONTRATADA o valor total de R$ {{valor_plano}} ({{valor_plano_extenso}}), conforme a modalidade de pagamento selecionada abaixo:

[{{chk_avista}}] À Vista: Valor integral de R$ {{valor_avista}} quitado no ato da assinatura via PIX ou transferência bancária.
[{{chk_cartao}}] Cartão de Crédito Parcelado: Em {{num_parcelas_cartao}} parcelas mensais de R$ {{valor_parcela_cartao}}, processadas na operadora da CONTRATADA.
[{{chk_pix_parcelado}}] PIX Parcelado / Recorrência: Em {{num_parcelas_pix}} parcelas mensais de R$ {{valor_parcela_pix}}, com vencimento fixado para todo dia {{dia_vencimento_pix}} de cada mês.

Parágrafo Primeiro: Os pagamentos efetuados por meio de PIX parcelado, boleto bancário ou transferências apenas serão considerados devidamente quitados após a efetiva compensação e liquidação dos fundos na conta bancária da CONTRATADA.

Parágrafo Segundo: O atraso no pagamento de qualquer parcela ou valor devido acarretará a incidência cumulativa de:
a) Correção monetária pelo índice oficial aplicável (IPCA/IBGE);
b) Multa moratória não compensatória de 2% (dois por cento) sobre o montante inadimplido;
c) Juros de mora de 1% (um por cento) ao mês, apurados pro rata die (0,033% ao dia) desde o vencimento até a data da efetiva liquidação.
Havendo inadimplência superior a 15 (quinze) dias, a CONTRATADA fica autorizada a inscrever o débito nos órgãos de proteção ao crédito (SPC, Serasa e congêneres), promover o competente protesto cartorário e executar a dívida por via judicial, hipótese em que serão acrescidos honorários advocatícios e de cobrança na ordem de 20% (vinte por cento) sobre o saldo devedor atualizado.

Parágrafo Terceiro: O valor ajustado remunera única e exclusivamente as consultas médicas, bioimpedâncias e acompanhamento clínico direto expressos no plano selecionado. Não estão inclusos no preço:
a) Exames laboratoriais de sangue, fezes, urina ou imagem realizados em laboratórios terceirizados;
b) Medicamentos de prescrição comercial, manipulados ou suplementações adquiridos pelo(a) paciente em farmácias;
c) Procedimentos hospitalares, internações ou atendimentos de pronto-socorro;
d) Deslocamentos e transporte do(a) paciente.

IV – DO CRONOGRAMA, AGENDAMENTOS E REMARCAÇÕES

4.1. Vigência do Contrato: O plano contratado possui prazo de vigência correspondente à sua duração estipulada na Cláusula II ({{vigencia_contrato}}), a contar da data de assinatura deste instrumento ou da data da consulta inicial. Todas as consultas e avaliações integrantes do pacote deverão ser agendadas e fruídas dentro deste intervalo de vigência.
4.2. Agendamento das Consultas: Os encontros médicos serão agendados conforme o cronograma do programa contratado e a mútua conveniência de agenda das partes.
4.3. Regras de Cancelamento e Remarcação:
- Consultas Médicas: Qualquer necessidade de remarcação deverá ser informada pelo(a) PACIENTE com antecedência mínima de 48 (quarenta e oito) horas úteis.
- Avaliações em Consultório / Bioimpedâncias / Procedimentos: O pedido de remarcação deverá ocorrer com antecedência mínima de 24 (vinte e quatro) horas úteis.
- Faltas Injustificadas: O não comparecimento no dia e horário agendados sem a comunicação prévia nos prazos supracitados importará na perda do respectivo encontro agendado, sendo a consulta considerada disponibilizada e computada como realizada para todos os efeitos, não havendo reposição extraordinária ou dedução financeira proporcional.

V – DAS OBRIGAÇÕES DAS PARTES

5.1. Obrigações do(a) CONTRATANTE (Paciente):
a) Honrar pontualmente os valores e formas de pagamento avençados;
b) Fornecer histórico de saúde fidedigno, declarando com transparência antecedentes mórbidos, cirurgias, alergias, medicações em uso e alterações clínicas pregressas;
c) Seguir com disciplina e responsabilidade as diretrizes médicas, orientações de estilo de vida e planos terapêuticos formulados pela CONTRATADA;
d) Realizar tempestivamente os exames laboratoriais e diagnósticos solicitados para que o acompanhamento médico conserve sua precisão técnica;
e) Informar prontamente à equipe clínica qualquer reação imprevista, desconforto ou sintoma atípico durante o percurso terapêutico.

5.2. Obrigações da CONTRATADA:
a) Prestar os serviços com o máximo rigor científico, ética médica e atenção personalizada, com base nos princípios da Medicina de Precisão;
b) Disponibilizar os agendamentos previstos no programa e fornecer os esclarecimentos cabíveis quanto às estratégias adotadas;
c) Zelar pela integridade, sigilo e guarda do prontuário médico do(a) paciente.

VI – DA NATUREZA DA OBRIGAÇÃO MÉDICA E DOS RESULTADOS

6.1. Por imperativo bioético e determinação legal e do Conselho Federal de Medicina, a prestação de serviços médicos consubstancia obrigação de meio e não de resultado.
6.2. O corpo humano responde de forma singular e multifatorial a qualquer intervenção, dependendo intimamente da individualidade biológica, da genética, do histórico metabólico e, crucialmente, do engajamento ativo do(a) PACIENTE no seguimento das diretrizes médicas e comportamentais. Portanto, a CONTRATADA não assegura, não promete e não quantifica resultados pré-fixados, tais como percentuais milagrosos de redução ponderal ou metas estéticas específicas.

VII – DA RESCISÃO CONTRATUAL, POLÍTICA DE RETENÇÃO E ABANDONO

7.1. Desistência Antes do Início: Na hipótese de o(a) CONTRATANTE requerer formalmente a desistência antes da realização da primeira consulta ou de qualquer procedimento clínico, o valor pago será devolvido com retenção de taxa administrativa de 10% (dez por cento) do valor total do contrato para cobrir despesas financeiras e operacionais de contratação.
7.2. Rescisão no Decorrer do Programa: Caso o(a) CONTRATANTE solicite a rescisão imotivada do contrato após o início dos atendimentos:
a) Serão deduzidos do valor total os serviços e consultas já efetivamente prestados ou disponibilizados, calculados com base no valor unitário avulso de tabela da clínica;
b) Sobre o saldo remanescente decorrente do cálculo anterior, incidirá multa rescisória e compensatória de 10% (dez por cento);
c) O saldo credor líquido apurado, se houver, será devolvido ao(à) CONTRATANTE no prazo de até 15 (quinze) dias úteis via transferência bancária.
7.3. Abandono de Tratamento: Considerar-se-á abandono unilateral de tratamento quando o(a) PACIENTE, por sua exclusiva vontade ou desídia, deixar de agendar suas consultas por mais de 60 (sessenta) dias consecutivos, sem justificativa médica plausível ou sem manter contato com a clínica, ou quando esgotado o prazo de vigência do contrato sem utilização das consultas contratadas. Configurado o abandono, cessa a responsabilidade médica da CONTRATADA quanto à continuidade clínica e não haverá direito à devolução de valores remanescentes.

VIII – DO SIGILO PROFISSIONAL E PROTEÇÃO DE DADOS (LGPD)

8.1. A CONTRATADA e sua equipe estão vinculadas ao mais estrito sigilo médico profissional e às exigências da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
8.2. O(a) CONTRATANTE autoriza o tratamento e arquivamento de seus dados pessoais e dados de saúde com finalidade exclusiva de assistência médica, prontuário clínico eletrônico, comunicações de agendamento e emissão de notas fiscais e controle financeiro.

IX – DOS PROTOCOLOS DE SEGURANÇA E URGÊNCIA

9.1. A CONTRATADA adota protocolos de segurança para consultas e procedimentos clínicos em conformidade com as diretrizes das sociedades médicas e conselhos profissionais.
9.2. Caso o(a) PACIENTE necessite de pronto atendimento de urgência ou emergência fora do horário de consultório ou que demande suporte hospitalar intensivo, declara-se ciente de que tais serviços deverão ser buscados em rede hospitalar ou pronto-socorro de sua preferência ou de seu plano de saúde, não estando os custos de assistência hospitalar incluídos no presente contrato.

X – DO FORO

10.1. Para dirimir quaisquer questões ou conflitos oriundos da interpretação ou execução deste contrato, as partes elegem a Comarca de Florianópolis / SC, com expressa renúncia a qualquer outro foro, por mais privilegiado que seja ou venha a ser.

E, por estarem plenamente esclarecidas, de comum acordo e conformes em todos os seus termos, firmam o presente Contrato de Prestação de Serviços Médicos em 2 (duas) vias de igual teor e forma.

Florianópolis - SC, {{data_extenso}}.


____________________________________________________
DRA. ANA CARLA MORONG
Médica CONTRATADA — CRM/SC {{crm_dra}}
CNPJ: 54.811.772/0001-32


____________________________________________________
CONTRATANTE / PACIENTE
Nome: {{nome}}
CPF: {{cpf}}`;

/**
 * Converte valores numéricos (ex: 13328.00) em texto por extenso em Reais com alta fidelidade gramatical
 */
export function numberToExtensoBRL(valor: number): string {
  if (isNaN(valor) || valor <= 0) return 'zero reais';

  const unidades = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
  ];
  const dezenas = [
    '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'
  ];
  const centenas = [
    '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
  ];

  const convertGroupOfThree = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const r = n % 100;
    const d = Math.floor(r / 10);
    const u = r % 10;

    const parts: string[] = [];
    if (c > 0) parts.push(centenas[c]);
    if (r > 0) {
      if (r < 20) {
        parts.push(unidades[r]);
      } else {
        if (d > 0) parts.push(dezenas[d]);
        if (u > 0) parts.push(unidades[u]);
      }
    }
    return parts.join(' e ');
  };

  const rounded = Math.round(valor * 100) / 100;
  const inteiro = Math.floor(rounded);
  const centavos = Math.round((rounded - inteiro) * 100);

  const milhoes = Math.floor(inteiro / 1000000);
  const restoMilhoes = inteiro % 1000000;
  const milhares = Math.floor(restoMilhoes / 1000);
  const restoMilhares = restoMilhoes % 1000;

  const partesInteiro: string[] = [];

  if (milhoes > 0) {
    if (milhoes === 1) {
      partesInteiro.push('um milhão');
    } else {
      partesInteiro.push(`${convertGroupOfThree(milhoes)} milhões`);
    }
  }

  if (milhares > 0) {
    if (milhares === 1 && milhoes === 0) {
      partesInteiro.push('um mil');
    } else if (milhares === 1) {
      partesInteiro.push('e um mil');
    } else {
      partesInteiro.push(`${convertGroupOfThree(milhares)} mil`);
    }
  }

  if (restoMilhares > 0) {
    const conjuncao =
      partesInteiro.length > 0
        ? restoMilhares < 100 || restoMilhares % 100 === 0
          ? ' e '
          : ', '
        : '';
    partesInteiro.push(`${conjuncao}${convertGroupOfThree(restoMilhares)}`);
  }

  let resultado = partesInteiro.join('').trim();
  if (inteiro === 1) {
    resultado += ' real';
  } else if (inteiro > 1) {
    resultado += ' reais';
  }

  if (centavos > 0) {
    const extCentavos = convertGroupOfThree(centavos);
    resultado += `${inteiro > 0 ? ' e ' : ''}${extCentavos} ${
      centavos === 1 ? 'centavo' : 'centavos'
    }`;
  }

  return resultado.replace(/\s+/g, ' ').trim();
}

export function formatMoneyBRL(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDataExtensoBR(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * Interface Oficial das 33 Tags do MODELO (3).docx
 */
export interface OfficialContractTagMap {
  nome: string;
  cpf: string;
  data_nascimento: string;
  endereco: string;
  bairro_cidade_uf: string;
  cep: string;
  telefone: string;
  email: string;
  chk_mapa: string;
  chk_restart: string;
  chk_evolution: string;
  chk_signature: string;
  chk_life: string;
  chk_personalizado: string;
  semanas_tratamento: string;
  duracao_personalizada: string;
  consulta_seg: string;
  frequencia_procedimentos: string;
  especificacoes_terapeuticas: string;
  valor_plano: string;
  valor_plano_extenso: string;
  chk_avista: string;
  valor_avista: string;
  chk_cartao: string;
  num_parcelas_cartao: string;
  valor_parcela_cartao: string;
  chk_pix_parcelado: string;
  num_parcelas_pix: string;
  valor_parcela_pix: string;
  dia_vencimento_pix: string;
  vigencia_contrato: string;
  data_extenso: string;
  crm_dra: string;
}

/**
 * Substitui todas as tags {{...}} pelo mapa de valores
 */
export function applyTagsToContractTemplate(
  template: string,
  tags: OfficialContractTagMap
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const k = key as keyof OfficialContractTagMap;
    return tags[k] !== undefined ? String(tags[k]) : `{{${key}}}`;
  });
}

/**
 * Limpa e sanitiza texto para a fonte padrão Helvetica (WinAnsi encoding)
 * Evita exceções do pdf-lib com caracteres fora do charset WinAnsi.
 */
function sanitizeTextForHelvetica(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[•·]/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/…/g, '...')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFC');
}

/**
 * Gera um PDF A4 paginado a partir do contrato preenchido e retorna Base64 + total de páginas
 * Garante margens de resguardo para rubricas no rodapé e formatação profissional.
 */
export async function generateContractPdfBase64(filledContractText: string): Promise<{
  pdfBase64: string;
  pageCount: number;
}> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 standard width (pt)
  const pageHeight = 841.89; // A4 standard height (pt)
  const marginX = 42;
  const maxTextWidth = pageWidth - marginX * 2;
  const bottomMargin = 80; // Resguardo para não sobrepor rubricas (y_percent ~ 91%)
  const topMargin = 48;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - topMargin;
  let pageIndex = 1;

  const sanitized = sanitizeTextForHelvetica(filledContractText);
  const lines = sanitized.split('\n');

  const addPageBreak = () => {
    // Desenha número de página no rodapé antes de criar nova página
    page.drawText(`Página ${pageIndex}`, {
      x: pageWidth - marginX - 50,
      y: 22,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });

    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pageIndex++;
    y = pageHeight - topMargin;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      y -= 8;
      if (y < bottomMargin) {
        addPageBreak();
      }
      continue;
    }

    const isMainTitle = trimmed.startsWith('CONTRATO DE PRESTAÇÃO');
    const isSectionHeader =
      /^[IVX]+\s*-\s*/.test(trimmed) ||
      trimmed.startsWith('CONTRATADA:') ||
      trimmed.startsWith('CONTRATANTE (PACIENTE):') ||
      trimmed.startsWith('[X]') ||
      trimmed.startsWith('Parágrafo');

    const font = isMainTitle || isSectionHeader ? fontBold : fontRegular;
    const size = isMainTitle ? 11 : isSectionHeader ? 9.2 : 8.6;
    const lineHeight = size + 4.0;

    // Se for o bloco final de assinatura, garante que não fique quebrado solitário
    if (trimmed.startsWith('E, por estarem plenamente esclarecidas') && y < 220) {
      addPageBreak();
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      let candidateWidth = 0;
      try {
        candidateWidth = font.widthOfTextAtSize(candidate, size);
      } catch {
        // Se algum caractere ainda falhar no encoding, desenha sem ele
        candidateWidth = font.widthOfTextAtSize(candidate.replace(/[^\x00-\x7F]/g, ''), size);
      }

      if (candidateWidth > maxTextWidth && currentLine) {
        if (y < bottomMargin) {
          addPageBreak();
        }
        try {
          page.drawText(currentLine, {
            x: marginX,
            y,
            size,
            font,
            color: rgb(0.08, 0.1, 0.14),
          });
        } catch {
          page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
            x: marginX,
            y,
            size,
            font,
            color: rgb(0.08, 0.1, 0.14),
          });
        }
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      if (y < bottomMargin) {
        addPageBreak();
      }
      try {
        page.drawText(currentLine, {
          x: marginX,
          y,
          size,
          font,
          color: rgb(0.08, 0.1, 0.14),
        });
      } catch {
        page.drawText(currentLine.replace(/[^\x00-\x7F]/g, ''), {
          x: marginX,
          y,
          size,
          font,
          color: rgb(0.08, 0.1, 0.14),
        });
      }
      y -= lineHeight;
    }
  }

  // Rodapé da última página
  page.drawText(`Página ${pageIndex} de ${pageIndex}`, {
    x: pageWidth - marginX - 60,
    y: 22,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    const sub = pdfBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }

  const pdfBase64 =
    typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(pdfBytes).toString('base64');

  return {
    pdfBase64,
    pageCount: pdfDoc.getPageCount(),
  };
}
