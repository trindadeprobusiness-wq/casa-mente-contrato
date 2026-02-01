
## Plano: Corrigir Geração de Mensagens com IA

### Problema Identificado

A funcionalidade "Gerar Mensagem com IA" não está funcionando porque:

1. A edge function `generate-whatsapp-message` usa a API do Google Gemini diretamente
2. Precisa da variável `GEMINI_API_KEY` configurada
3. Há um erro de TypeScript na edge function (error é do tipo 'unknown')

### Solução Proposta

Em vez de configurar a chave do Gemini manualmente, vou **migrar para o Lovable AI Gateway** que:
- Já está configurado (LOVABLE_API_KEY existe)
- Não requer configuração adicional
- Usa os mesmos modelos (Gemini) por baixo dos panos
- É mais seguro e gerenciado automaticamente

---

### Mudanças a Realizar

#### 1. Atualizar a Edge Function `generate-whatsapp-message`

Migrar de:
```typescript
// Antes: Google Generative AI direto
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
const apiKey = Deno.env.get('GEMINI_API_KEY')
```

Para:
```typescript
// Depois: Lovable AI Gateway
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)
```

#### 2. Corrigir Erro de TypeScript

Alterar a linha 48-52 para tratar corretamente o tipo `unknown`:
```typescript
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
}
```

#### 3. Atualizar config.toml

Adicionar a configuração da edge function:
```toml
[functions.generate-whatsapp-message]
verify_jwt = false
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-whatsapp-message/index.ts` | Migrar para Lovable AI Gateway |
| `supabase/config.toml` | Adicionar configuração da função |

---

### Benefícios

1. **Funciona imediatamente** - Sem necessidade de adicionar chaves API
2. **Mais estável** - Gateway gerenciado pelo Lovable
3. **Mesmo modelo** - Usa Gemini (google/gemini-3-flash-preview)
4. **Sem custo adicional** - Incluído no Lovable Cloud
5. **Corrige erros de build** - TypeScript agora válido

---

### Fluxo Após a Correção

```
1. Usuário clica no ícone de varinha mágica na fatura
2. Dialog abre com opções de tipo e tom
3. Clica em "Gerar Mensagem"
4. Edge function chama Lovable AI Gateway
5. Mensagem profissional é gerada em português
6. Usuário pode copiar ou enviar via WhatsApp
```
