import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContratoRequest {
  tipo: string;
  cliente: {
    nome: string;
    cpf?: string;
    rg?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    nacionalidade?: string;
    estado_civil?: string;
    profissao?: string;
  };
  imovel: {
    endereco: string;
    bairro: string;
    cidade: string;
    tipo: string;
    area_m2: number;
    dormitorios: number;
    garagem: number;
    descricao?: string;
  };
  proprietario: {
    nome: string;
    cpf?: string;
    telefone?: string;
  };
  corretor: {
    nome: string;
    creci: string;
    creci_estado: string;
    telefone?: string;
    email?: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: ContratoRequest = await req.json();
    console.log("Received contract generation request:", JSON.stringify(body, null, 2));

    const { tipo, cliente, imovel, proprietario, corretor, detalhes } = body;

    // Validate required fields
    if (!tipo || !cliente?.nome || !imovel?.endereco) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando: tipo, cliente.nome, imovel.endereco" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dataAtual = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const valorPorExtenso = valorParaExtenso(detalhes.valor);

    const systemPrompt = `Você é um advogado especialista em direito imobiliário brasileiro com 20 anos de experiência.
Gere contratos profissionais seguindo rigorosamente as normas do Código Civil brasileiro e práticas do mercado imobiliário.

REGRAS OBRIGATÓRIAS:
1. Use linguagem jurídica formal brasileira
2. NUNCA use emojis, markdown, asteriscos ou formatação especial
3. Use apenas texto puro e bem estruturado
4. Numere as cláusulas como "CLÁUSULA PRIMEIRA", "CLÁUSULA SEGUNDA", etc.
5. Use letras maiúsculas para títulos de seções
6. Inclua todas as cláusulas obrigatórias por lei
7. Valores devem aparecer em numeral E por extenso
8. Datas por extenso
9. Espaços para assinatura claramente demarcados com linhas`;

    const userPrompt = `Gere um contrato de ${tipo} com as seguintes informações:

DADOS DO LOCADOR/VENDEDOR:
- Nome: ${proprietario.nome}
- CPF: ${proprietario.cpf || "A ser informado"}
- Telefone: ${proprietario.telefone || "A ser informado"}

DADOS DO LOCATÁRIO/COMPRADOR:
- Nome: ${cliente.nome}
- CPF: ${cliente.cpf || "A ser informado"}
- RG: ${cliente.rg || "A ser informado"}
- Telefone: ${cliente.telefone || "A ser informado"}
- Email: ${cliente.email || "A ser informado"}
- Endereço: ${cliente.endereco || "A ser informado"}
- Nacionalidade: ${cliente.nacionalidade || "brasileiro(a)"}
- Estado Civil: ${cliente.estado_civil || "A ser informado"}
- Profissão: ${cliente.profissao || "A ser informado"}

DADOS DO IMÓVEL:
- Endereço Completo: ${imovel.endereco}, ${imovel.bairro} - ${imovel.cidade}
- Tipo: ${imovel.tipo}
- Área: ${imovel.area_m2}m²
- Dormitórios: ${imovel.dormitorios}
- Vagas de Garagem: ${imovel.garagem}
- Descrição: ${imovel.descricao || "Conforme vistoria"}

CONDIÇÕES COMERCIAIS:
- Valor: R$ ${detalhes.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${valorPorExtenso})
- Data de Início: ${detalhes.data_inicio || "A definir"}
- Prazo: ${detalhes.prazo_meses} meses
- Dia de Vencimento: ${detalhes.dia_vencimento}
- Índice de Reajuste: ${detalhes.indice_reajuste}

CLÁUSULAS ADICIONAIS:
- Animais de estimação: ${detalhes.permite_animais ? "PERMITIDO" : "NÃO PERMITIDO"}
- Reformas: ${detalhes.permite_reformas ? "PERMITIDAS mediante autorização por escrito" : "NÃO PERMITIDAS"}
- Mobiliado: ${detalhes.mobiliado ? "SIM - conforme inventário anexo" : "NÃO"}
${detalhes.clausulas_adicionais ? `- Outras: ${detalhes.clausulas_adicionais}` : ""}

DADOS DO CORRETOR/INTERMEDIÁRIO:
- Nome: ${corretor.nome}
- CRECI: ${corretor.creci}/${corretor.creci_estado}
- Telefone: ${corretor.telefone || "A ser informado"}
- Email: ${corretor.email || "A ser informado"}

LOCAL E DATA: ${imovel.cidade}, ${dataAtual}

ESTRUTURA OBRIGATÓRIA DO CONTRATO:
1. TÍTULO centralizado (ex: "CONTRATO DE LOCAÇÃO RESIDENCIAL")
2. QUALIFICAÇÃO DAS PARTES (dados completos de cada parte)
3. CLÁUSULA PRIMEIRA - DO OBJETO
4. CLÁUSULA SEGUNDA - DO PRAZO
5. CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO
6. CLÁUSULA QUARTA - DO REAJUSTE
7. CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO LOCADOR
8. CLÁUSULA SEXTA - DAS OBRIGAÇÕES DO LOCATÁRIO
9. CLÁUSULA SÉTIMA - DA RESCISÃO
10. CLÁUSULA OITAVA - DAS PENALIDADES
11. CLÁUSULA NONA - DA VISTORIA
12. CLÁUSULA DÉCIMA - DO FORO
13. DISPOSIÇÕES GERAIS (se aplicável)
14. FECHO com local e data por extenso
15. ESPAÇOS PARA ASSINATURAS com linhas e identificação`;

    console.log("Calling Lovable AI Gateway...");
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    const endTime = Date.now();
    const tempoGeracaoMs = endTime - startTime;
    console.log(`AI response received in ${tempoGeracaoMs}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao gerar contrato. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const contratoGerado = data.choices?.[0]?.message?.content;

    if (!contratoGerado) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Contract generated successfully, length:", contratoGerado.length);

    return new Response(
      JSON.stringify({
        contrato: contratoGerado,
        modelo_ia: "google/gemini-2.5-flash",
        tempo_geracao_ms: tempoGeracaoMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in gerar-contrato function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to convert number to Brazilian Portuguese words
function valorParaExtenso(valor: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";
  if (valor === 100) return "cem reais";

  const partes: string[] = [];
  
  const milhoes = Math.floor(valor / 1000000);
  const milhares = Math.floor((valor % 1000000) / 1000);
  const reais = Math.floor(valor % 1000);
  const centavos = Math.round((valor % 1) * 100);

  const converterGrupo = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "cem";
    
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    let resultado = "";
    if (c > 0) resultado += centenas[c];
    
    if (d === 1) {
      if (resultado) resultado += " e ";
      resultado += especiais[u];
    } else {
      if (d > 0) {
        if (resultado) resultado += " e ";
        resultado += dezenas[d];
      }
      if (u > 0) {
        if (resultado) resultado += " e ";
        resultado += unidades[u];
      }
    }
    
    return resultado;
  };

  if (milhoes > 0) {
    partes.push(converterGrupo(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
  }
  if (milhares > 0) {
    if (milhares === 1) {
      partes.push("mil");
    } else {
      partes.push(converterGrupo(milhares) + " mil");
    }
  }
  if (reais > 0) {
    partes.push(converterGrupo(reais));
  }

  let resultado = partes.join(", ");
  
  if (valor >= 1) {
    resultado += valor === 1 ? " real" : " reais";
  }
  
  if (centavos > 0) {
    if (resultado) resultado += " e ";
    resultado += converterGrupo(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }

  return resultado;
}
