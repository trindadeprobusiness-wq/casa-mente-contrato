// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role to bypass RLS for public webhooks
    )

    // Parse URL to see if imovel_id is passed as query parameter
    const url = new URL(req.url);
    const imovel_id = url.searchParams.get('imovel_id');

    // Also support JSON body
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      payload = {};
    }

    const {
      nome, 
      email, 
      telefone, 
      celular,
      phone,
      first_name,
      last_name,
      utm_source, 
      utm_campaign, 
      utm_medium, 
      fbclid,
      // Suporte a diferentes formatos genéricos de plataformas (Typeform, Meta, etc)
      ...otherData
    } = payload;

    const clienteNome = nome || (first_name ? `${first_name} ${last_name || ''}`.trim() : 'Lead de Campanha');
    const clienteTelefone = telefone || celular || phone || '(00) 00000-0000';
    const clienteEmail = email;

    const tracking_data = {
      utm_source,
      utm_campaign,
      utm_medium,
      fbclid,
      captura_origem: 'webhook_inbound',
      payload_raw: otherData
    };

    // 1. Encontrar o ID do corretor padrão (ou o corretor dono do imóvel)
    let corretor_id;
    if (imovel_id) {
        const { data: imovelData } = await supabaseClient
            .from('imoveis')
            .select('corretor_id')
            .eq('id', imovel_id)
            .single();
        if (imovelData) {
            corretor_id = imovelData.corretor_id;
        }
    }
    
    // Fallback: get the latest corretor from corretores table
    if (!corretor_id) {
         const { data: corretorData } = await supabaseClient
            .from('corretores')
            .select('id')
            .limit(1)
            .single();
         corretor_id = corretorData?.id;
    }

    if (!corretor_id) {
        throw new Error("Não foi possível encontrar um ID de corretor para atribuir.");
    }

    // 2. Inserir Cliente
    const { data: novoCliente, error: clienteError } = await supabaseClient
      .from('clientes')
      .insert({
        nome: clienteNome,
        telefone: clienteTelefone,
        email: clienteEmail,
        tipo_interesse: 'AMBOS',
        status_funil: 'QUALIFICACAO',
        corretor_id: corretor_id,
        tracking_data: tracking_data,
        ultimo_contato: new Date().toISOString()
      })
      .select()
      .single()

    if (clienteError) throw clienteError;

    // 3. Vincular ao Imovel (se houver)
    const target_imovel_id = imovel_id || payload.imovel_id;
    
    if (target_imovel_id) {
        // Inserir na tabela de muitos-para-muitos
        const { error: vinculoError } = await supabaseClient
            .from('cliente_imovel')
            .insert({
                cliente_id: novoCliente.id,
                imovel_id: target_imovel_id
            });
            
        if (vinculoError) {
             console.error("Erro ao vincular ao imóvel:", vinculoError);
             // Não cancelamos a operação principal pois o lead já foi salvo
        }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Lead capturado com sucesso!', cliente_id: novoCliente.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
