import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
    console.log("Iniciando RESET TOTAL das Faturas...");

    // 1. Deletar todas as faturas atuais
    console.log("Limpando faturas existentes...");
    const { error: deleteErr } = await supabase
        .from('faturas_aluguel')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteErr) {
        console.error("Erro ao deletar faturas:", deleteErr);
        return;
    }
    console.log("Faturas limpas com sucesso.");

    // 2. Buscar todos os contratos ativos
    const { data: contracts, error: errC } = await supabase
        .from('contratos')
        .select('*')
        .eq('status', 'ATIVO');

    if (errC) {
        console.error("Erro ao buscar contratos:", errC);
        return;
    }

    console.log(`Contratos Ativos Encontrados: ${contracts?.length}`);

    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let criadas = 0;

    // 3. Criar uma fatura para cada contrato
    for (const c of contracts || []) {
        const dueDay = c.dia_vencimento || 10;
        const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        const isLate = dueDate < now;

        console.log(`Gerando fatura para o contrato ID: ${c.id}...`);

        const { error: insertErr } = await supabase.from('faturas_aluguel').insert({
            contrato_id: c.id,
            cliente_id: c.cliente_id,
            imovel_id: c.imovel_id,
            corretor_id: c.corretor_id,
            valor_total: c.valor,
            valor_aluguel: c.valor, // Some tables require this for the generated column
            data_vencimento: dueDate.toISOString(),
            status: isLate ? 'ATRASADO' : 'PENDENTE',
            mes_referencia: currentMonthStr,
            data_geracao: now.toISOString(),
        });

        if (insertErr) {
            console.error(`Erro ao criar fatura do contrato ${c.id}:`, insertErr);
        } else {
            criadas++;
        }
    }

    console.log(`\nRESET CONCLUÍDO. ${criadas} faturas foram criadas.`);
}

run();
