import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const tipo = url.searchParams.get('tipo') // VENDA | ALUGUEL
    const limit = Math.min(Number(url.searchParams.get('limit') || 8), 20)

    let query = supabase
      .from('imoveis')
      .select('id, titulo, tipo, valor, area_m2, dormitorios, garagem, bairro, cidade, fotos, descricao, status_venda')
      .eq('status_venda', 'DISPONIVEL')
      .limit(limit)

    // Filter by tipo_interesse if specified
    if (tipo) {
      query = query.eq('tipo_interesse', tipo)
    }

    const { data, error } = await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ imoveis: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
