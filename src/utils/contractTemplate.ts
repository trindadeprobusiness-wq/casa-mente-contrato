
export interface ContractData {
    tipo: string;
    cliente: {
        nome: string;
        cpf?: string;
        rg?: string;
        endereco?: string;
        nacionalidade?: string;
        estado_civil?: string;
        profissao?: string;
        telefone?: string;
        email?: string;
    };
    proprietario: {
        nome: string;
        cpf?: string;
    };
    imovel: {
        endereco: string;
        bairro: string;
        cidade: string;
        tipo: string;
        area_m2: number;
        dormitorios: number;
        garagem: number;
    };
    detalhes: {
        valor: number;
        data_inicio: string;
        prazo_meses: number;
        dia_vencimento: number;
        indice_reajuste: string;
        permite_animais: boolean;
        permite_reformas: boolean;
        mobiliado: boolean;
        clausulas_adicionais?: string;
    };
}

export function generateLocalContract(data: ContractData): string {
    const currentDate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const valorExtenso = data.detalhes.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `CONTRATO DE LOCAÇÃO RESIDENCIAL

IDENTIFICAÇÃO DAS PARTES CONTRATANTES

LOCADOR: ${data.proprietario.nome}, portador(a) do CPF nº ${data.proprietario.cpf || '___________'}.

LOCATÁRIO: ${data.cliente.nome}, nacionalidade ${data.cliente.nacionalidade || '___________'}, estado civil ${data.cliente.estado_civil || '___________'}, profissão ${data.cliente.profissao || '___________'}, portador(a) do RG nº ${data.cliente.rg || '___________'} e CPF nº ${data.cliente.cpf || '___________'}, residente e domiciliado em ${data.cliente.endereco || '___________'}.
Contato: ${data.cliente.telefone || '___________'} / ${data.cliente.email || '___________'}.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Locação Residencial, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

DO OBJETO DO CONTRATO

CLÁUSULA PRIMEIRA: O presente contrato tem como OBJETO o imóvel de propriedade do LOCADOR, situado na ${data.imovel.endereco}, Bairro ${data.imovel.bairro}, Cidade ${data.imovel.cidade}, com área de ${data.imovel.area_m2}m², ${data.imovel.dormitorios} dormitórios e ${data.imovel.garagem} vagas de garagem.

CLÁUSULA SEGUNDA: Destina-se o imóvel, objeto deste contrato, exclusivamente para fins residenciais.

DO PRAZO DE LOCAÇÃO

CLÁUSULA TERCEIRA: O prazo de locação é de ${data.detalhes.prazo_meses} meses, iniciando-se em ${new Date(data.detalhes.data_inicio).toLocaleDateString('pt-BR')} e terminando em ${new Date(new Date(data.detalhes.data_inicio).setMonth(new Date(data.detalhes.data_inicio).getMonth() + data.detalhes.prazo_meses)).toLocaleDateString('pt-BR')}, independentemente de aviso, notificação ou interpelação judicial ou extrajudicial.

DO VALOR E REAJUSTE

CLÁUSULA QUARTA: O valor mensal da locação é de ${valorExtenso}, a ser pago mensalmente até o dia ${data.detalhes.dia_vencimento} de cada mês subsequente ao vencido.

CLÁUSULA QUINTA: O valor do aluguel será reajustado anualmente de acordo com a variação do índice ${data.detalhes.indice_reajuste} ou outro que venha a substituí-lo.

DAS CONDIÇÕES GERAIS

CLÁUSULA SEXTA: O LOCATÁRIO declara receber o imóvel em perfeito estado de conservação e limpeza.

CLÁUSULA SÉTIMA - ANIMAIS: ${data.detalhes.permite_animais ? 'É permitida' : 'NÃO é permitida'} a permanência de animais de estimação no imóvel.

CLÁUSULA OITAVA - REFORMAS: ${data.detalhes.permite_reformas ? 'São permitidas reformas mediante autorização prévia.' : 'NÃO são permitidas reformas ou modificações na estrutura do imóvel sem prévia autorização por escrito do LOCADOR.'}

CLÁUSULA NONA - MOBÍLIA: ${data.detalhes.mobiliado ? 'O imóvel é locado com mobília, conforme laudo de vistoria anexo.' : 'O imóvel é locado sem mobília.'}

${data.detalhes.clausulas_adicionais ? `CLÁUSULA DÉCIMA - DISPOSIÇÕES ADICIONAIS:\n${data.detalhes.clausulas_adicionais}\n` : ''}

DO FORO

CLÁUSULA DÉCIMA PRIMEIRA: Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de ${data.imovel.cidade}.

Por estarem assim justos e contratados, firmam o presente instrumento, em duas vias de igual teor.

${data.imovel.cidade}, ${currentDate}.


________________________________________
LOCADOR: ${data.proprietario.nome}


________________________________________
LOCATÁRIO: ${data.cliente.nome}
`;
}
