# n8n Workflows — Ecossistema Imobiliário

5 workflows modulares que compõem o menu inteligente profissional.

## Importação

No n8n (`http://localhost:5678`):
1. **Workflows → Import from File** e selecione cada `.json` desta pasta.
2. Configure credenciais:
   - **Evolution API (HTTP Header Auth)** → header `apikey` com o valor de `AUTHENTICATION_API_KEY` (em `infra/.env`).
   - **Supabase (HTTP Header Auth)** → header `x-n8n-secret` (bate com `N8N_SHARED_SECRET` das edge functions).
   - **Google Gemini (PaLM API)** → chave `GOOGLE_API_KEY`.
3. Publique (`Activate`) cada workflow.
4. Crie a **Data Table** `whatsapp_sessions` com colunas:
   - `phone` (string, unique)
   - `state` (string) — `NEW|IN_MENU|IN_QUALIFICATION|HANDOFF`
   - `context_json` (json)
   - `last_interaction` (dateTime)

## Ordem lógica

```
Evolution API ──webhook──▶ A. evolution-webhook-router
                                │
               ┌────────────────┼────────────────┬──────────────┐
               ▼                ▼                ▼              ▼
       B. menu-inteligente  C. menu-handler  D. qualificacao-gemini  (HANDOFF: no-op)

                 E. fallback-erros  (Error Trigger global)
```

## Variáveis de ambiente n8n

Adicione em `n8n` (docker env ou `.env`):

```
EVOLUTION_BASE_URL=http://host.docker.internal:8080
EVOLUTION_INSTANCE=imobiliaria
SUPABASE_EDGE_URL=https://<project>.functions.supabase.co
N8N_SHARED_SECRET=<mesma do vault>
ADMIN_PHONE=5511999999999
```
