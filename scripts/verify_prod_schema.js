import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const SUPABASE_URL = "https://kvvldgrnljnhjbrltphj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2dmxkZ3JubGpuaGpicmx0cGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODMwNDMsImV4cCI6MjA4Mjk1OTA0M30.H5keNt1DZYCZzgRAWk39XTRKHkaE4RGtjeqX-xYMT9U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log(`🔍 Verificando Cache e Relações em ${SUPABASE_URL} ...`);

    // 1. Check Faturas + Relations (Clientes, Imoveis)
    const { data: faturas, error: faturasError } = await supabase
        .from('faturas_aluguel')
        .select(`
            id,
            clientes ( nome ),
            imoveis ( titulo )
        `)
        .limit(1);

    if (faturasError) {
        console.error("❌ Erro em Faturas (com relações):", faturasError.message);
    } else {
        console.log("✅ Faturas e Relações: OK");
    }

    // 2. Check Repasses + Relations (Contratos -> Imoveis)
    const { data: repasses, error: repassesError } = await supabase
        .from('repasses_proprietario')
        .select(`
            id,
            contratos (
                imoveis ( titulo )
            )
        `)
        .limit(1);

    if (repassesError) {
        console.error("❌ Erro em Repasses (com relações):", repassesError.message);
    } else {
        console.log("✅ Repasses e Relações: OK");
    }
}

verify().catch(console.error);
