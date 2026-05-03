// Guard compartilhado: valida header x-n8n-secret contra secret do Vault
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function assertN8nSecret(req: Request): void {
  const expected = Deno.env.get('N8N_SHARED_SECRET')
  if (!expected) throw new Error('N8N_SHARED_SECRET not configured')
  const got = req.headers.get('x-n8n-secret')
  if (!got || got !== expected) {
    const err = new Error('unauthorized')
    // @ts-ignore anexar status para o catch externo
    err.status = 401
    throw err
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
