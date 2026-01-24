import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dqlolypbmsjgqrvdesev.supabase.co";
// Using Service Role Key would be better to bypass RLS, but we only have Anon.
// If RLS blocks us, we might fail. 
// However, in local dev/some setups anon might have permissions if logic allows it.
// Let's rely on the user having some existing session or open policies?
// Wait, the policies I created bind everything to `get_corretor_id()` which looks at `auth.uid()`.
// Without signing in as a user, I cannot insert data linked to a specific broker if RLS is on.
// I need to sign in first.

// I'll grab the ANON key.
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbG9seXBibXNqZ3FydmRlc2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI5MTAsImV4cCI6MjA4MjIzODkxMH0.GtABaIXfPuIYe0TTNJ8MvpFeTOw87vnR-T8MIezpNu4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log("🌱 Starting seed process...");

    // 1. Authenticate (Mock or Real)
    // Since I don't have a password, I can't login.
    // CRITICAL: New policies require authentication.
    // I will try to use a specialized Service Role Key if I had one, but I don't.
    // Alternative: The user is logged in the BROWSER.
    // Maybe I should NOT run this script from Node if I can't bypass RLS.

    // BUT... I can try to see if I can find a user to "impersonate" or if there's a test user.
    // Let's try to Sign Up a temporary test user just for this script?
    const email = `test_broker_${Date.now()}@example.com`;
    const password = "password123";

    console.log(`Creating test user: ${email}`);
    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.log("Auth error (maybe user exists, trying login):", authError.message);
        const { data: { user: loginUser }, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (loginError) {
            console.error("FATAL: Could not login.", loginError);
            process.exit(1);
        }
    }

    // Brief wait for trigger to create 'corretores'
    await new Promise(r => setTimeout(r, 2000));

    // 2. Get Corretor ID
    const { data: corretor, error: corretorError } = await supabase
        .from('corretores')
        .select('id')
        .single();

    if (corretorError || !corretor) {
        console.error("Could not find corretor profile after signup.", corretorError);
        process.exit(1);
    }
    console.log(`✅ Using Corretor ID: ${corretor.id}`);

    // 3. Create Tenant (Cliente)
    const { data: cliente, error: clientError } = await supabase
        .from('clientes')
        .insert({
            corretor_id: corretor.id,
            nome: "Inquilino Teste Silva",
            email: "inquilino@teste.com",
            cpf: "123.456.789-00",
            telefone: "11999999999",
            tipo_interesse: 'LOCACAO',
            status_funil: 'FECHADO_GANHO'
        })
        .select()
        .single();

    if (clientError) throw clientError;
    console.log(`✅ Tenant Created: ${cliente.nome}`);

    // 4. Create Property (Imovel)
    const { data: imovel, error: imovelError } = await supabase
        .from('imoveis')
        .insert({
            corretor_id: corretor.id,
            titulo: "Apartamento Jardins - Teste Automacao",
            tipo: 'APARTAMENTO',
            endereco: "Rua Augusta, 1000",
            cidade: "São Paulo",
            valor: 3500.00, // Valor Venda (base)
            proprietario_nome: "Proprietário Exemplo",
            proprietario_email: "dono@exemplo.com"
        })
        .select()
        .single();

    if (imovelError) throw imovelError;
    console.log(`✅ Property Created: ${imovel.titulo}`);

    // 5. Create Contract
    const { data: contrato, error: contractError } = await supabase
        .from('contratos')
        .insert({
            corretor_id: corretor.id,
            cliente_id: cliente.id,
            imovel_id: imovel.id,
            tipo: 'LOCACAO_RESIDENCIAL',
            valor: 2500.00, // Aluguel
            data_inicio: '2026-01-01',
            dia_vencimento_aluguel: 15,
            dia_repasse_proprietario: 20,
            taxa_administracao_percentual: 10.0,
            conteudo: "Contrato de teste gerado automaticamente.",
            status: 'ATIVO'
        })
        .select()
        .single();

    if (contractError) throw contractError;
    console.log(`✅ Contract Created: ID ${contrato.id}`);

    // 6. Generate Bills (RPC)
    // We use current date to generate for this month/next month logic
    const { data: billsCount, error: rpcError } = await supabase
        .rpc('generate_monthly_rent_bills', { reference_date: new Date().toISOString() });

    if (rpcError) throw rpcError;

    console.log(`🚀 Automation Triggered! Generated ${billsCount} bills.`);
}

seed().catch(console.error);
