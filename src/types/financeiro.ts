export type TipoLancamento = 'RECEITA' | 'DESPESA';

export type CategoriaFinanceira = 
  // Despesas
  | 'ANUNCIO_PORTAL'
  | 'ANUNCIO_SOCIAL'
  | 'ANUNCIO_TRADICIONAL'
  | 'OPERACIONAL_ESCRITORIO'
  | 'OPERACIONAL_TRANSPORTE'
  | 'OPERACIONAL_SISTEMA'
  | 'IMPOSTO_ISS'
  | 'IMPOSTO_IR'
  | 'TAXA_BANCARIA'
  | 'COMISSAO_PARCEIRO'
  // Receitas
  | 'COMISSAO_VENDA'
  | 'COMISSAO_LOCACAO'
  | 'TAXA_INTERMEDIACAO'
  | 'HONORARIO_AVALIACAO'
  | 'CONSULTORIA'
  // Geral
  | 'OUTROS';

export interface LancamentoFinanceiro {
  id: string;
  corretor_id: string;
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  descricao: string;
  valor: number;
  data: string;
  recorrente: boolean;
  contrato_id?: string;
  imovel_id?: string;
  comprovante_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumoFinanceiro {
  receita_total: number;
  despesa_total: number;
  lucro: number;
  margem: number;
}

export interface LancamentoPorCategoria {
  categoria: CategoriaFinanceira;
  total: number;
  percentual: number;
}

export interface ProjecaoMensal {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
  projetado?: boolean;
}

export const CATEGORIA_LABELS: Record<CategoriaFinanceira, string> = {
  ANUNCIO_PORTAL: 'Portais (ZAP, VivaReal, OLX)',
  ANUNCIO_SOCIAL: 'Redes Sociais (Meta, Google)',
  ANUNCIO_TRADICIONAL: 'Tradicional (Placas, Panfletos)',
  OPERACIONAL_ESCRITORIO: 'Escritório (Aluguel, Luz)',
  OPERACIONAL_TRANSPORTE: 'Transporte (Combustível)',
  OPERACIONAL_SISTEMA: 'Sistemas e Ferramentas',
  IMPOSTO_ISS: 'ISS',
  IMPOSTO_IR: 'Imposto de Renda',
  TAXA_BANCARIA: 'Tarifas Bancárias',
  COMISSAO_PARCEIRO: 'Comissão a Parceiros',
  COMISSAO_VENDA: 'Comissão de Venda',
  COMISSAO_LOCACAO: 'Comissão de Locação',
  TAXA_INTERMEDIACAO: 'Taxa de Intermediação',
  HONORARIO_AVALIACAO: 'Avaliação de Imóveis',
  CONSULTORIA: 'Consultoria',
  OUTROS: 'Outros',
};

export const CATEGORIA_ICONS: Record<CategoriaFinanceira, string> = {
  ANUNCIO_PORTAL: '🌐',
  ANUNCIO_SOCIAL: '📱',
  ANUNCIO_TRADICIONAL: '📋',
  OPERACIONAL_ESCRITORIO: '🏢',
  OPERACIONAL_TRANSPORTE: '🚗',
  OPERACIONAL_SISTEMA: '💻',
  IMPOSTO_ISS: '📄',
  IMPOSTO_IR: '📑',
  TAXA_BANCARIA: '🏦',
  COMISSAO_PARCEIRO: '🤝',
  COMISSAO_VENDA: '💰',
  COMISSAO_LOCACAO: '🔑',
  TAXA_INTERMEDIACAO: '📝',
  HONORARIO_AVALIACAO: '📊',
  CONSULTORIA: '💼',
  OUTROS: '📦',
};

export const CATEGORIAS_DESPESA: CategoriaFinanceira[] = [
  'ANUNCIO_PORTAL',
  'ANUNCIO_SOCIAL',
  'ANUNCIO_TRADICIONAL',
  'OPERACIONAL_ESCRITORIO',
  'OPERACIONAL_TRANSPORTE',
  'OPERACIONAL_SISTEMA',
  'IMPOSTO_ISS',
  'IMPOSTO_IR',
  'TAXA_BANCARIA',
  'COMISSAO_PARCEIRO',
  'OUTROS',
];

export const CATEGORIAS_RECEITA: CategoriaFinanceira[] = [
  'COMISSAO_VENDA',
  'COMISSAO_LOCACAO',
  'TAXA_INTERMEDIACAO',
  'HONORARIO_AVALIACAO',
  'CONSULTORIA',
  'OUTROS',
];
