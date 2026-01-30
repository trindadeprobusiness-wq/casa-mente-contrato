import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dqlolypbmsjgqrvdesev.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbG9seXBibXNqZ3FydmRlc2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI5MTAsImV4cCI6MjA4MjIzODkxMH0.GtABaIXfPuIYe0TTNJ8MvpFeTOw87vnR-T8MIezpNu4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log("🔍 Verificando tabelas do módulo de aluguel...");

    // Check faturas_aluguel
    const { error: faturasError } = await supabase
        .from('faturas_aluguel')
        .select('id', { count: 'exact', head: true });

    if (faturasError && faturasError.code === '42P01') { // 42P01 is "undefined_table" in Postgres
        console.error("❌ Tabela 'faturas_aluguel' NÃO encontrada.");
    } else if (faturasError) {
        console.log(`⚠️ Tabela 'faturas_aluguel' parece existir, mas deu outro erro (pode ser RLS): ${faturasError.message}`);
    } else {
        console.log("✅ Tabela 'faturas_aluguel' encontrada com sucesso.");
    }

    // Check repasses_proprietario
    const { error: repassesError } = await supabase
        .from('repasses_proprietario')
        .select('id', { count: 'exact', head: true });

    if (repassesError && repassesError.code === '42P01') {
        console.error("❌ Tabela 'repasses_proprietario' NÃO encontrada.");
    } else if (repassesError) {
        console.log(`⚠️ Tabela 'repasses_proprietario' parece existir, mas deu outro erro (pode ser RLS): ${repassesError.message}`);
    } else {
        console.log("✅ Tabela 'repasses_proprietario' encontrada com sucesso.");
    }

    // Check new columns in contratos
    const { error: contratosError } = await supabase
        .from('contratos')
        .select('taxa_administracao_percentual') // Try to select a new column
        .limit(1);

    if (contratosError) {
        console.log(`⚠️ Coluna 'taxa_administracao_percentual' em 'contratos' pode não existir ou erro de permissão: ${contratosError.message}`);
    } else {
        console.log("✅ Coluna 'taxa_administracao_percentual' confirmada na tabela 'contratos'.");
    }
}

verify().catch(console.error);
