import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { clientName, messageType, details, tone } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not found in environment variables')
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        let prompt = `Act as a professional real estate agent assistant. Write a short, clear WhatsApp message in Portuguese (Brazil) for a client named "${clientName}".
    
    Context:
    - Message Type: ${messageType}
    - Tone: ${tone || 'friendly'}
    - Details: ${JSON.stringify(details)}
    
    Guidelines:
    - Use appropriate emojis but don't overdo it.
    - Be concise and polite.
    - Do not include subject lines or placeholders like [Name], use the provided name.
    - If it's a payment reminder, mention the value and due date clearly.
    - If it's a "thank you", confirm the payment receipt.
    `

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return new Response(
            JSON.stringify({ message: text }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
