import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

async function run() {
    console.log("Iniciando Verificação via REST API nativa...");

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    const cRes = await fetch(`${supabaseUrl}/rest/v1/contratos?status=eq.ATIVO&select=*`, { headers });
    const contracts = await cRes.json();

    if (!Array.isArray(contracts)) {
        console.error("Erro listando contratos:", contracts);
        return;
    }

    const bRes = await fetch(`${supabaseUrl}/rest/v1/faturas_aluguel?select=*`, { headers });
    const bills = await bRes.json();

    console.log(`Contratos Ativos: ${contracts.length}`);
    console.log(`Total Faturas: ${bills.length}`);

    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const billsByContract = new Set(bills.map(b => b.contrato_id));

    let criadas = 0;

    for (const c of contracts) {
        if (!billsByContract.has(c.id)) {
            console.log(`Fatura ausente para o contrato ID: ${c.id}. Criando...`);
            const dueDay = c.dia_vencimento || 10;
            const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
            const isLate = dueDate < now;

            const payload = {
                contrato_id: c.id,
                valor_total: c.valor,
                data_vencimento: dueDate.toISOString(),
                status: isLate ? 'ATRASADO' : 'PENDENTE',
                mes_referencia: currentMonthStr,
                data_geracao: now.toISOString()
            };

            const insertRes = await fetch(`${supabaseUrl}/rest/v1/faturas_aluguel`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!insertRes.ok) {
                const err = await insertRes.json();
                console.error(`Falha ao inserir para contrato ${c.id}:`, err);
            } else {
                console.log(`Fatura criada com sucesso!`);
                criadas++;
            }
        }
    }

    console.log(`Finalizado. Foram criadas ${criadas} faturas ausentes.`);
}

run().catch(console.error);
