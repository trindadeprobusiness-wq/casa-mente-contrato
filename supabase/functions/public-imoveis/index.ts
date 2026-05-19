import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

/**
 * Edge Function: public-imoveis
 * 
 * Endpoint público (sem auth) que retorna imóveis anunciados no site.
 * Apenas imóveis com anunciado=true, status_venda=DISPONIVEL, ativo=true.
 * Inclui fotos via JOIN com imovel_fotos.
 * 
 * Query params:
 *   - tipo: "venda" | "aluguel" (filtra por finalidade)
 *   - limit: número (max 20, default 12)
 *   - offset: número (paginação, default 0)
 *   - bairro: string (filtro ilike)
 *   - preco_min: número
 *   - preco_max: número
 *   - quartos_min: número
 *   - tipo_imovel: "APARTAMENTO" | "CASA" | "COMERCIAL" | "TERRENO"
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const tipo = url.searchParams.get('tipo')?.toLowerCase() // "venda" | "aluguel"
    const limit = Math.min(Number(url.searchParams.get('limit') || '12'), 20)
    const offset = Number(url.searchParams.get('offset') || '0')
    const bairro = url.searchParams.get('bairro')
    const precoMin = url.searchParams.get('preco_min')
    const precoMax = url.searchParams.get('preco_max')
    const quartosMin = url.searchParams.get('quartos_min')
    const tipoImovel = url.searchParams.get('tipo_imovel')

    // Buscar imóveis anunciados com fotos
    let query = supabase
      .from('imoveis')
      .select(`
        id, titulo, tipo, valor, area_m2, dormitorios, banheiros, garagem,
        endereco, bairro, cidade, estado, descricao, descricao_curta,
        status_venda, finalidade, anunciado, created_at,
        imovel_fotos ( id, arquivo_url, ordem, principal )
      `, { count: 'exact' })
      .eq('status_venda', 'DISPONIVEL')
      .eq('ativo', true)
      .eq('anunciado', true)

    // Filtro por finalidade (venda/aluguel)
    if (tipo === 'venda') {
      query = query.in('finalidade', ['VENDA', 'AMBOS'])
    } else if (tipo === 'aluguel') {
      query = query.in('finalidade', ['LOCACAO', 'AMBOS'])
    }

    // Filtro por tipo de imóvel
    if (tipoImovel) {
      query = query.eq('tipo', tipoImovel.toUpperCase())
    }

    // Filtro por bairro (busca parcial)
    if (bairro) {
      query = query.ilike('bairro', `%${bairro}%`)
    }

    // Filtro por faixa de preço
    if (precoMin) {
      query = query.gte('valor', Number(precoMin))
    }
    if (precoMax) {
      query = query.lte('valor', Number(precoMax))
    }

    // Filtro por quartos mínimos
    if (quartosMin) {
      query = query.gte('dormitorios', Number(quartosMin))
    }

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Normalizar resposta: ordenar fotos por ordem, extrair URLs
    const imoveis = (data || []).map((imovel: any) => {
      const fotos = (imovel.imovel_fotos || [])
        .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))

      const fotoPrincipal = fotos.find((f: any) => f.principal) || fotos[0]

      return {
        id: imovel.id,
        titulo: imovel.titulo,
        tipo_imovel: imovel.tipo,
        tipo_negocio: imovel.finalidade === 'LOCACAO' ? 'aluguel' : 'venda',
        valor: Number(imovel.valor),
        area_m2: Number(imovel.area_m2) || 0,
        dormitorios: imovel.dormitorios || 0,
        banheiros: imovel.banheiros || 0,
        garagem: imovel.garagem || 0,
        endereco: imovel.endereco,
        bairro: imovel.bairro,
        cidade: imovel.cidade,
        estado: imovel.estado,
        descricao: imovel.descricao,
        descricao_curta: imovel.descricao_curta || (imovel.descricao?.substring(0, 120) + '...'),
        foto_principal: fotoPrincipal?.arquivo_url || null,
        fotos: fotos.map((f: any) => f.arquivo_url),
        created_at: imovel.created_at,
      }
    })

    return new Response(
      JSON.stringify({
        data: imoveis,
        total: count || 0,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
