import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { message, attachmentUrl, attachmentType } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyC_bk4eWjrwb2YtKa7hW_QuxRmHRPeU1kw' // Fallback to provided key if env not set

        if (!apiKey) {
            throw new Error('Gemini API Key not configured')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" }) // Use vision model for versatility
        const textModel = genAI.getGenerativeModel({ model: "gemini-pro" })

        let result;
        let text = message || "Analise este arquivo";

        if (attachmentUrl && attachmentType === 'image') {
            // Fetch the image
            const imageResp = await fetch(attachmentUrl)
            const imageBlob = await imageResp.blob()
            const arrayBuffer = await imageBlob.arrayBuffer()
            const base64Image = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

            const parts = [
                { text: text },
                {
                    inlineData: {
                        mimeType: "image/jpeg", // Assuming generic jpeg for simplicity, or detect from url
                        data: base64Image
                    }
                }
            ]
            result = await model.generateContent(parts)
        } else {
            // Text only interaction
            result = await textModel.generateContent(text)
        }

        const response = result.response
        const responseText = response.text()

        return new Response(
            JSON.stringify({ reply: responseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
