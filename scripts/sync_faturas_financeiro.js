import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const envPaths = ['.env', '.env.local'];
    for (const envFile of envPaths) {
        const envPath = path.resolve(process.cwd(), envFile);
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    let val = match[2] || '';
                    val = val.replace(/^['"]|['"]$/g, '');
                    process.env[match[1]] = val;
                }
            });
        }
    }
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE URL or KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCommissions() {
    console.log("Fetching paid rental bills...");
    const { data: faturas, error: faturasError } = await supabase
        .from('faturas_aluguel')
        .select(`
            id, contrato_id, cliente_id, imovel_id, corretor_id, valor_aluguel, valor_total, data_vencimento, status,
            mes_referencia, data_pagamento, valor_pago,
            contratos (
                taxa_administracao_percentual,
                valor,
                dia_vencimento,
                dia_repasse_proprietario,
                imoveis ( titulo, proprietario_nome )
            )
        `)
        .eq('status', 'PAGO');

    if (faturasError) {
        console.error("Error fetching faturas:", faturasError);
        return;
    }

    console.log(`Found ${faturas?.length} paid faturas.`);

    for (const fatura of faturas || []) {
        const contrato = fatura.contratos;
        if (!contrato) continue;

        const taxaAdmPercentual = contrato.taxa_administracao_percentual || 10;
        const valorBase = contrato.valor || fatura.valor_total;
        const valorTaxaAdm = (valorBase * taxaAdmPercentual) / 100;
        const valorLiquido = fatura.valor_total - valorTaxaAdm;
        const dataPagamento = fatura.data_pagamento || new Date().toISOString();

        // Check if Financial record already exists for this contract and this month
        // We look for a RECEITA, COMISSAO_LOCACAO around this date
        const { data: existingFin } = await supabase
            .from('lancamentos_financeiros')
            .select('id')
            .eq('contrato_id', fatura.contrato_id)
            .eq('categoria', 'COMISSAO_LOCACAO')
            .eq('valor', valorTaxaAdm)
            .gte('data', dataPagamento.substring(0, 10))
            .limit(1);

        if (!existingFin || existingFin.length === 0) {
            console.log(`Creating missing Commission record for Fatura ${fatura.id} - Imovel: ${contrato.imoveis?.titulo}`);
            const { error: finError } = await supabase.from('lancamentos_financeiros').insert({
                tipo: 'RECEITA',
                categoria: 'COMISSAO_LOCACAO',
                descricao: `Comissão Adm (${taxaAdmPercentual}%) - ${contrato.imoveis?.titulo || 'Imóvel'} (Sync)`,
                valor: valorTaxaAdm,
                data: dataPagamento.substring(0, 10),
                corretor_id: fatura.corretor_id,
                imovel_id: fatura.imovel_id,
                contrato_id: fatura.contrato_id
            });
            if (finError) console.error("Error inserting fin:", finError);
        }

        // Check if Repasse exists
        const { data: existingRepasse } = await supabase
            .from('repasses_proprietario')
            .select('id')
            .eq('fatura_origem_id', fatura.id)
            .limit(1);

        if (!existingRepasse || existingRepasse.length === 0) {
            console.log(`Creating missing Repasse record for Fatura ${fatura.id}`);

            const diaRepasse = contrato.dia_repasse_proprietario || 15;
            const dueDate = new Date(fatura.data_vencimento);
            let dataRepasse = new Date(dueDate);
            dataRepasse.setDate(diaRepasse);
            if (dataRepasse <= dueDate) {
                dataRepasse.setMonth(dataRepasse.getMonth() + 1);
            }

            const { error: repasseError } = await supabase.from('repasses_proprietario').insert({
                fatura_origem_id: fatura.id,
                contrato_id: fatura.contrato_id,
                corretor_id: fatura.corretor_id,
                proprietario_nome: contrato.imoveis?.proprietario_nome || 'Não Informado',
                data_prevista: dataRepasse.toISOString().substring(0, 10),
                valor_bruto_recebido: fatura.valor_total,
                valor_taxa_adm: valorTaxaAdm,
                valor_liquido_repasse: valorLiquido,
                status: 'AGENDADO'
            });
            if (repasseError) console.error("Error inserting repasse:", repasseError);
        }
    }
    console.log("Sync complete!");
}

syncCommissions();
