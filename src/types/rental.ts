export interface ContratoLocacaoMap {
    taxa_administracao_percentual?: number;
    dia_vencimento_aluguel?: number;
    dia_repasse_proprietario?: number;
    multa_atraso_percentual?: number;
    juros_mora_diario_percentual?: number;
    dados_bancarios_repasse?: {
        banco?: string;
        agencia?: string;
        conta?: string;
        pix?: string;
        tipo_chave?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
    };
    vistoria_entrada_url?: string;
    garantia_tipo?: 'CAUCAO' | 'FIADOR' | 'SEGURO_FIANCA' | 'OUTRO';
}

export interface FaturaAluguel {
    id: string;
    contrato_id: string;
    cliente_id: string;
    imovel_id: string;
    corretor_id: string;
    mes_referencia: string; // "MM/YYYY"
    data_vencimento: string; // ISO Date
    valor_aluguel: number;
    valor_condominio: number;
    valor_iptu: number;
    valor_extras: number;
    valor_desconto: number;
    valor_total: number;
    status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
    data_pagamento?: string; // ISO Date
    valor_pago?: number;
    comprovante_url?: string;
    boleto_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface RepasseProprietario {
    id: string;
    fatura_origem_id?: string;
    contrato_id: string;
    corretor_id: string;
    proprietario_nome: string;
    data_prevista: string; // ISO Date
    valor_bruto_recebido: number;
    valor_taxa_adm: number;
    valor_liquido_repasse: number;
    status: 'AGENDADO' | 'ENVIADO' | 'CONFIRMADO' | 'ERRO';
    data_transferencia?: string; // ISO Date
    comprovante_transferencia_url?: string;
    created_at?: string;
    updated_at?: string;
}
