import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
    console.log("Iniciando verificação de contratos sem faturas...");

    // Busca todos os contratos ativos
    const { data: contracts, error: errC } = await supabase
        .from('contratos')
        .select('*')
        .eq('status', 'ATIVO');

    if (errC) {
        console.error("Erro ao buscar contratos:", errC);
        return;
    }

    // Busca as faturas existentes do mês atual
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const { data: bills, error: errB } = await supabase
        .from('faturas_aluguel')
        .select('*');

    if (errB) {
        console.error("Erro ao buscar faturas:", errB);
        return;
    }

    console.log(`Contratos Ativos Encontrados: ${contracts?.length}`);
    console.log(`Total de Faturas Encontradas: ${bills?.length}`);

    // Cria um Set com as IDs de contratos que já possuem fatura
    const contractsWithBills = new Set(bills?.map((b) => b.contrato_id) || []);

    let criadas = 0;

    for (const c of contracts || []) {
        if (!contractsWithBills.has(c.id)) {
            console.log(`Fatura ausente para o contrato ID: ${c.id}. Criando agora...`);

            const dueDay = c.dia_vencimento || 10;
            const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
            const isLate = dueDate < now;

            const { error: insertErr } = await supabase.from('faturas_aluguel').insert({
                contrato_id: c.id,
                valor_total: c.valor,
                data_vencimento: dueDate.toISOString(),
                status: isLate ? 'ATRASADO' : 'PENDENTE',
                mes_referencia: currentMonthStr,
                data_geracao: now.toISOString(),
            });

            if (insertErr) {
                console.error(`Erro ao criar fatura do contrato ${c.id}:`, insertErr);
            } else {
                console.log(`Fatura criada com sucesso para o contrato ${c.id}!`);
                criadas++;
            }
        }
    }

    console.log(`\nSincronização concluída. ${criadas} faturas foram criadas.`);
}

run();
