import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

async function run() {
    console.log("Iniciando RESET TOTAL das Faturas via REST API...");

    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // 1. Fetch active contracts FIRST to make sure we don't wipe bills if contracts can't be fetched
    const cRes = await fetch(`${supabaseUrl}/rest/v1/contratos?status=eq.ATIVO&select=*`, { headers });
    const contracts = await cRes.json();

    if (!Array.isArray(contracts) || contracts.length === 0) {
        console.error("Erro listando contratos ativos ou nenhum contrato encontrado:", contracts);
        return;
    }

    console.log(`Encontrados ${contracts.length} Contratos Ativos.`);

    // 2. Delete all existing bills
    console.log("Deletando todas as faturas atuais...");
    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/faturas_aluguel?id=not.eq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers
    });

    if (!deleteRes.ok) {
        const err = await deleteRes.json();
        console.error("Falha ao deletar faturas:", err);
        return;
    }

    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    let criadas = 0;

    // 3. Create a new bill for each active contract
    for (const c of contracts) {
        console.log(`Gerando fatura nova para o contrato ID: ${c.id}...`);
        const dueDay = c.dia_vencimento || 10;
        const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        const isLate = dueDate < now;

        // We must supply valor_aluguel because valor_total is a GENERATED column from valor_aluguel
        const payload = {
            contrato_id: c.id,
            cliente_id: c.cliente_id,
            imovel_id: c.imovel_id,
            corretor_id: c.corretor_id,
            valor_aluguel: c.valor,
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
            criadas++;
        }
    }

    console.log(`Finalizado! ${criadas} faturas recriadas. Total no painel deve ser = ${contracts.length}`);
}

run().catch(console.error);
