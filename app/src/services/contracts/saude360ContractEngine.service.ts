// src/services/contracts/saude360ContractEngine.service.ts
import { PDFDocument, StandardFonts, rgb, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  LETTERHEAD_PAGE1_BASE64,
  LETTERHEAD_PAGE2_BASE64,
} from '@/assets/contractLetterheadBase64';

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
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Zonas seguras do PDF do contrato (em pontos, origem no canto inferior esquerdo da página).
 * Derivadas da medição do papel timbrado oficial (1448x2048 px => 1 px = 0,4111 pt):
 *  - Página 1: logo/contato terminam a 68 pt do topo; mancha verde na esquerda (x 0-177 pt)
 *    sobe até 147 pt do rodapé; frase "Prevenção, Ciência e Longevidade." em x 395-575, y 22-34.
 *  - Páginas 2+: QR + endereço em x 24-220, y 22-79; mancha verde na direita (x >= 419) até 102 pt.
 */
export const CONTRACT_PDF_LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  marginX: 56.7,
  page1: { top: 110, bottom: 148 },
  otherPages: { top: 72, bottom: 148 },
  noLetterhead: { top: 60, bottom: 148 },
  // Faixa de rubricas (lado direito, entre 95pt e 121pt da base, segura do rodapé timbrado e do texto)
  rubric: { bottom: 95, height: 26, width: 64, gap: 8 },
  // Espaço reservado acima das linhas de assinatura e dimensões exatas do campo
  signature: {
    spaceAbove: 66,
    boxHeight: 56,
    boxWidth: 260,
    boxLift: 3,
    interSignerGap: 34,
  },
  // Numeração em todas as páginas: centralizada na faixa livre entre os motivos gráficos
  pageNumber: { y: 28, centerX: 310 },
} as const;

export interface ContractPdfAnchor {
  page: number;
  x_percent: number;
  y_percent: number; // origem no topo da página
  width_percent: number;
  height_percent: number;
}

export interface ContractPdfLayoutResult {
  pdfBase64: string;
  pageCount: number;
  /** Posição real das linhas de assinatura medidas durante a diagramação */
  signatureAnchors: {
    dra?: ContractPdfAnchor;
    patient?: ContractPdfAnchor;
  };
  /** Caixas de rubrica (mesma posição em todas as páginas, exceto a última) */
  initialsBoxes: {
    patient: Omit<ContractPdfAnchor, 'page'>;
    dra: Omit<ContractPdfAnchor, 'page'>;
  };
}

/**
 * Gera um PDF A4 paginado de altíssima fidelidade a partir do contrato preenchido.
 * Respeita as zonas seguras do papel timbrado, mantém o bloco final de assinaturas
 * inteiro na mesma página e devolve as âncoras reais de assinatura/rubrica.
 */
export async function generateContractPdfBase64(
  filledContractText: string
): Promise<ContractPdfLayoutResult> {
  const L = CONTRACT_PDF_LAYOUT;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Carrega e embute fontes fiéis ao DOCX original (EB Garamond & Poppins)
  let fontRegular: any;
  let fontBold: any;
  let fontFooter: any;

  try {
    const [regRes, boldRes, popRes] = await Promise.all([
      fetch('/fonts/EBGaramond-regular.ttf'),
      fetch('/fonts/EBGaramond-bold.ttf'),
      fetch('/fonts/Poppins-regular.ttf'),
    ]);

    if (regRes.ok && boldRes.ok && popRes.ok) {
      const [regBuf, boldBuf, popBuf] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer(),
        popRes.arrayBuffer(),
      ]);
      fontRegular = await pdfDoc.embedFont(new Uint8Array(regBuf));
      fontBold = await pdfDoc.embedFont(new Uint8Array(boldBuf));
      fontFooter = await pdfDoc.embedFont(new Uint8Array(popBuf));
    } else {
      throw new Error('Fontes TTF não disponíveis via HTTP');
    }
  } catch (err) {
    console.warn('Utilizando fontes padrão do sistema com resguardo:', err);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontFooter = fontRegular;
  }

  // Carrega e embute o Papel Timbrado Oficial
  let bgImg1: PDFImage | null = null;
  let bgImg2: PDFImage | null = null;

  try {
    bgImg1 = await pdfDoc.embedPng(base64ToUint8Array(LETTERHEAD_PAGE1_BASE64));
    bgImg2 = await pdfDoc.embedPng(base64ToUint8Array(LETTERHEAD_PAGE2_BASE64));
  } catch (err) {
    console.warn('Papel timbrado não pôde ser embutido, gerando versão padrão:', err);
  }

  const pageWidth = L.pageWidth;
  const pageHeight = L.pageHeight;
  const marginX = L.marginX;
  const maxTextWidth = pageWidth - marginX * 2;

  let pageIndex = 1;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  if (bgImg1) {
    page.drawImage(bgImg1, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  }

  const limitsFor = (idx: number) => {
    if (!bgImg1) return L.noLetterhead;
    return idx === 1 ? L.page1 : L.otherPages;
  };
  const bottomLimit = () => limitsFor(pageIndex).bottom;

  let y = pageHeight - limitsFor(1).top;

  const addPageBreak = () => {
    pageIndex++;
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    if (bgImg2) {
      page.drawImage(bgImg2, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }
    y = pageHeight - limitsFor(pageIndex).top;
  };

  const widthOf = (font: any, text: string, size: number): number => {
    try {
      return font.widthOfTextAtSize(text, size);
    } catch {
      return font.widthOfTextAtSize(text.replace(/[^\x00-\x7F]/g, ''), size);
    }
  };

  const drawSafe = (text: string, x: number, yy: number, size: number, font: any) => {
    const opts = { x, y: yy, size, font, color: rgb(0.12, 0.14, 0.17) };
    try {
      page.drawText(text, opts);
    } catch {
      page.drawText(text.replace(/[^\x00-\x7F]/g, ''), opts);
    }
  };

  const sanitized = sanitizeTextForHelvetica(filledContractText);
  const lines = sanitized.split('\n');

  // Início do bloco final de assinaturas (mantido inteiro na mesma página)
  const sigStartIdx = lines.findIndex((l) => l.trim().startsWith('E, por estarem plenamente esclarecidas'));

  const classify = (trimmed: string, inSig: boolean) => {
    const isMainTitle = trimmed.startsWith('CONTRATO DE PRESTAÇÃO');
    const isSectionHeader =
      /^[IVX]+\s*[-–—]\s*/.test(trimmed) ||
      trimmed.startsWith('CONTRATADA:') ||
      trimmed.startsWith('CONTRATANTE (PACIENTE):') ||
      trimmed.startsWith('2.2. Diretrizes Técnicas') ||
      trimmed.startsWith('Parágrafo');
    const isProgramItem = /^\[[X\s]\]\s+/i.test(trimmed);
    const isIndentedItem = /^[a-z]\)\s+/i.test(trimmed) || /^[-–]\s+/i.test(trimmed);
    const isUnderline = inSig && trimmed.startsWith('___________________');
    const isCentered =
      isMainTitle ||
      (inSig &&
        (isUnderline ||
          trimmed.startsWith('DRA. ANA CARLA MORONG') ||
          trimmed.startsWith('Médica CONTRATADA') ||
          trimmed.startsWith('CNPJ: 54.811.772/0001-32') ||
          trimmed.startsWith('CONTRATANTE / PACIENTE') ||
          trimmed.startsWith('Nome:') ||
          trimmed.startsWith('CPF:')));
    const font = isMainTitle || isSectionHeader || isProgramItem ? fontBold : fontRegular;
    const size = isMainTitle ? 11.5 : isSectionHeader ? 10.5 : 10;
    return {
      isMainTitle,
      isSectionHeader,
      isUnderline,
      isCentered,
      font,
      size,
      lineHeight: size + 4.2,
      indent: isIndentedItem ? 14 : 0,
    };
  };

  const wrap = (trimmed: string, st: ReturnType<typeof classify>): string[] => {
    const out: string[] = [];
    const maxW = maxTextWidth - st.indent - 3; // folga p/ ligaduras/kerning do renderizador
    let current = '';
    for (const word of trimmed.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (widthOf(st.font, candidate, st.size) > maxW && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
    return out;
  };

  // Altura garantida para o bloco atômico de assinaturas (do "E, por estarem..." até o CPF)
  const measureSignatureBlock = (): number => {
    // 1. Encerramento e data: ~50 pt
    // 2. Contratada: spaceAbove (66) + linha + dados médica (42) = 110 pt
    // 3. Gap entre signatários: 34 pt
    // 4. Contratante: spaceAbove (66) + linha + dados paciente (42) = 110 pt
    // Total garantido = 304 pt + 36 pt margem de resguardo = 340 pt
    return 340;
  };

  const signatureAnchors: ContractPdfLayoutResult['signatureAnchors'] = {};
  let underlineCount = 0;
  let inSig = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (sigStartIdx >= 0 && i === sigStartIdx) {
      inSig = true;
      // Mantém o bloco inteiro na mesma página: se não couber com folga total, quebra para nova página
      if (y - measureSignatureBlock() < bottomLimit()) {
        addPageBreak();
      }
    }

    if (!trimmed) {
      y -= 6.5;
      if (y < bottomLimit()) addPageBreak();
      continue;
    }

    const st = classify(trimmed, inSig);

    // Título de seção: nunca fica órfão no fim da página (exige espaço p/ título + 2 linhas)
    if (st.isSectionHeader && !st.isMainTitle) {
      y -= 4;
      if (y - st.lineHeight * 3 < bottomLimit()) addPageBreak();
    }

    // Espaço reservado para a assinatura acima da linha e gap entre signatários
    if (st.isUnderline) {
      y -= L.signature.spaceAbove;
    }

    const wrapped = wrap(trimmed, st);
    for (const textLine of wrapped) {
      if (y < bottomLimit()) addPageBreak();

      if (st.isUnderline) {
        underlineCount++;
        const boxW = L.signature.boxWidth;
        const boxH = L.signature.boxHeight;
        const lineX = (pageWidth - boxW) / 2;

        // Traço elegante e vetorial para a linha de assinatura
        page.drawLine({
          start: { x: lineX, y: y + 2 },
          end: { x: lineX + boxW, y: y + 2 },
          thickness: 0.8,
          color: rgb(0.35, 0.42, 0.48),
        });

        const anchor: ContractPdfAnchor = {
          page: pageIndex,
          x_percent: Number(((lineX / pageWidth) * 100).toFixed(2)),
          y_percent: Number(
            (((pageHeight - (y + L.signature.boxLift + boxH)) / pageHeight) * 100).toFixed(2)
          ),
          width_percent: Number(((boxW / pageWidth) * 100).toFixed(2)),
          height_percent: Number(((boxH / pageHeight) * 100).toFixed(2)),
        };

        if (underlineCount === 1) signatureAnchors.dra = anchor;
        else if (underlineCount === 2) signatureAnchors.patient = anchor;
      } else {
        const lineW = widthOf(st.font, textLine, st.size);
        const drawX = st.isCentered ? (pageWidth - lineW) / 2 : marginX + st.indent;
        drawSafe(textLine, drawX, y, st.size, st.font);
      }

      y -= st.lineHeight;
    }
  }

  // Rodapé oficial "Clínica Dra. Ana Morong | Página X de Y." — impresso em TODAS as páginas
  // do contrato (incluindo a página 1) posicionado na faixa livre e limpa do papel timbrado.
  const totalPages = pdfDoc.getPageCount();
  const allPages = pdfDoc.getPages();
  for (let p = 0; p < totalPages; p++) {
    const footerText = `Clínica Dra. Ana Morong | Página ${p + 1} de ${totalPages}.`;
    const fSize = 8.5;
    const fWidth = widthOf(fontFooter, footerText, fSize);
    allPages[p].drawText(footerText, {
      x: L.pageNumber.centerX - fWidth / 2,
      y: L.pageNumber.y,
      size: fSize,
      font: fontFooter,
      color: rgb(0.25, 0.33, 0.29), // #405549 oficial da identidade visual
    });
  }

  // Caixas de rubrica (lado direito, acima da mancha das páginas 2+ e fora da frase da pág. 1)
  const rightEdge = pageWidth - marginX;
  const rubricTopPct = ((pageHeight - (L.rubric.bottom + L.rubric.height)) / pageHeight) * 100;
  const rubricBox = (x: number) => ({
    x_percent: Number(((x / pageWidth) * 100).toFixed(2)),
    y_percent: Number(rubricTopPct.toFixed(2)),
    width_percent: Number(((L.rubric.width / pageWidth) * 100).toFixed(2)),
    height_percent: Number(((L.rubric.height / pageHeight) * 100).toFixed(2)),
  });
  const draX = rightEdge - L.rubric.width;
  const patientX = draX - L.rubric.gap - L.rubric.width;

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
    signatureAnchors,
    initialsBoxes: {
      patient: rubricBox(patientX),
      dra: rubricBox(draX),
    },
  };
}
