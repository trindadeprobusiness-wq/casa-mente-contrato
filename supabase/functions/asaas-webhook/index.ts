import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // CORS Handling
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Validate Token (Immediate 401 if invalid)
        // NOTE: In production, use Deno.env.get('ASAAS_WEBHOOK_TOKEN')
        // For now, hardcoding the one provided by user for testing simplicity or checking header.
        const requestToken = req.headers.get('x-hook-token');
        const secretToken = "X-Hook-Token-SECRET-COLOQUE_AQUI_ALGO_COMPLEXO"; // Value from user prompt

        if (requestToken !== secretToken) {
            console.error("Invalid Webhook Token");
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Parse Payload
        const payload = await req.json();
        const { event, payment } = payload;

        console.log(`Received Event: ${event} for Payment: ${payment?.id}`);

        // 3. Setup Supabase Client (Admin Access)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 4. Log Audit
        await supabase.from('webhook_logs').insert({
            provider: 'ASAAS',
            event_type: event,
            payload: payload,
            status: 'PROCESSING'
        });

        // 5. Handle Events
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const netValue = payment.netValue;
            const paymentDate = payment.paymentDate; // 'YYYY-MM-DD'

            // A. Update Fatura Status
            const { data: fatura, error: findError } = await supabase
                .from('faturas_aluguel')
                .select('*, contratos(*)')
                .eq('external_id', payment.id)
                .single();

            if (findError || !fatura) {
                console.warn(`Fatura not found via external_id ${payment.id}. Trying fallback via ID mapping?`);
                // Fallback logic if needed (e.g. search by value + date) could go here
                // For now, just return success to Asaas to avoid retries on non-mapped items
            } else {
                // Update Fatura to PAID
                await supabase.from('faturas_aluguel').update({
                    status: 'PAGO',
                    valor_pago: payment.value,
                    data_pagamento: paymentDate,
                    data_credito: payment.creditDate,
                    asaas_status: payment.status,
                    recibo_url: payment.transactionReceiptUrl,
                    raw_payload: payload
                }).eq('id', fatura.id);

                // B. Run "Split" Logic (ON_RECEBIMENTO_PAGO)
                // Logic adapted from our PL/pgSQL function but executed here for control
                const contract = fatura.contratos;
                const taxaAdmPct = contract.taxa_administracao_percentual || 10.0;
                const taxaAdmValor = payment.value * (taxaAdmPct / 100);

                // Calculate extra reimbursements (condo + iptu)
                // Limitation: payment.netValue in Asaas already subtracts Asaas Fees.
                // Our Logic: (Rent - Fee) + Extras
                // We need to reconcile if 'value' matches expected 'valor_total'.

                const ownerNet = (payment.value - taxaAdmValor)
                    + (fatura.valor_condominio || 0)
                    + (fatura.valor_iptu || 0)
                    + (fatura.valor_extras || 0);

                // Create Repasse
                await supabase.from('repasses_proprietario').insert({
                    fatura_origem_id: fatura.id,
                    contrato_id: contract.id,
                    corretor_id: fatura.corretor_id,
                    proprietario_nome: 'Verificar no Imóvel', // Simplify for sync
                    data_prevista: payment.creditDate, // Or calculated logic
                    valor_bruto_recebido: payment.value,
                    valor_taxa_adm: taxaAdmValor,
                    valor_liquido_repasse: ownerNet,
                    status: 'AGENDADO',
                    external_id: null // To be filled when transfer happens
                });

                console.log(`Payment Processed: ${fatura.id}`);
            }
        } else if (event === 'PAYMENT_CREATED') {
            // Optional: Sync status if created externally
        }

        // 6. Return Success
        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Error processing webhook:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
