export type TipoInteresse = 'COMPRA' | 'LOCACAO' | 'AMBOS';

export type StatusFunil = 
  | 'QUALIFICACAO' 
  | 'VISITA_PROPOSTA' 
  | 'DOCUMENTACAO' 
  | 'FECHADO_GANHO' 
  | 'FECHADO_PERDIDO';

export type TipoContato = 
  | 'LIGACAO' 
  | 'EMAIL' 
  | 'WHATSAPP' 
  | 'VISITA' 
  | 'PROPOSTA' 
  | 'NOTA';

export type TipoImovel = 
  | 'APARTAMENTO' 
  | 'CASA' 
  | 'COMERCIAL' 
  | 'TERRENO';

export type TipoContrato = 
  | 'COMPRA_VENDA' 
  | 'LOCACAO_RESIDENCIAL' 
  | 'LOCACAO_COMERCIAL' 
  | 'EXCLUSIVIDADE_VENDA' 
  | 'EXCLUSIVIDADE_LOCACAO' 
  | 'DISTRATO' 
  | 'PROCURACAO';

export type PrioridadeAlerta = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  tipo_interesse: TipoInteresse;
  status_funil: StatusFunil;
  ultimo_contato: string;
  proximo_followup?: string;
  observacoes?: string;
  documentos: Documento[];
  imoveis_interesse: string[];
  created_at: string;
}

export interface Imovel {
  id: string;
  titulo: string;
  tipo: TipoImovel;
  valor: number;
  area_m2: number;
  dormitorios: number;
  garagem: number;
  endereco: string;
  bairro: string;
  cidade: string;
  descricao?: string;
  exclusividade_ate?: string;
  proprietario_nome: string;
  proprietario_cpf?: string;
  proprietario_telefone?: string;
  clientes_interessados: string[];
  fotos?: string[];
  created_at: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  cliente_id?: string;
  imovel_id?: string;
  validado: boolean;
  data_validade?: string;
  arquivo_url?: string;
  created_at: string;
}

export interface HistoricoContato {
  id: string;
  cliente_id: string;
  tipo: TipoContato;
  descricao: string;
  data: string;
  created_at: string;
}

export interface Alerta {
  id: string;
  mensagem: string;
  prioridade: PrioridadeAlerta;
  cliente_id?: string;
  imovel_id?: string;
  tipo: 'FOLLOWUP' | 'DOCUMENTO' | 'EXCLUSIVIDADE' | 'GERAL';
  lido: boolean;
  created_at: string;
}

export interface Contrato {
  id: string;
  tipo: TipoContrato;
  cliente_id: string;
  imovel_id: string;
  valor: number;
  data_inicio: string;
  prazo_meses?: number;
  dia_vencimento?: number;
  indice_reajuste?: string;
  clausulas_adicionais?: string[];
  conteudo: string;
  status: 'RASCUNHO' | 'FINALIZADO';
  created_at: string;
}

export const STATUS_FUNIL_LABELS: Record<StatusFunil, string> = {
  QUALIFICACAO: 'Qualificação',
  VISITA_PROPOSTA: 'Visita/Proposta',
  DOCUMENTACAO: 'Documentação',
  FECHADO_GANHO: 'Fechado Ganho',
  FECHADO_PERDIDO: 'Fechado Perdido',
};

export const TIPO_CONTATO_LABELS: Record<TipoContato, string> = {
  LIGACAO: 'Ligação',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  VISITA: 'Visita',
  PROPOSTA: 'Proposta',
  NOTA: 'Nota',
};

export const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  COMPRA_VENDA: 'Compra e Venda',
  LOCACAO_RESIDENCIAL: 'Locação Residencial',
  LOCACAO_COMERCIAL: 'Locação Comercial',
  EXCLUSIVIDADE_VENDA: 'Exclusividade (Venda)',
  EXCLUSIVIDADE_LOCACAO: 'Exclusividade (Locação)',
  DISTRATO: 'Termo de Distrato',
  PROCURACAO: 'Procuração',
};
