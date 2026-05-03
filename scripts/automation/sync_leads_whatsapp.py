"""Reconciliação periódica entre WhatsApp e CRM.

Regras:
- Atualiza `clientes.ultimo_contato` com o max(data_contato) de `historico_contatos` tipo=WHATSAPP.
- Gera alertas para leads `quente`/`morno` sem follow-up há > 48h.
- Remove alertas redundantes já atendidos.

Uso:
    python sync_leads_whatsapp.py [--dry-run]
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client, create_client

from _config import Settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("sync-leads")

STALE_HOURS = 48


def get_client(cfg: Settings) -> Client:
    return create_client(cfg.supabase_url, cfg.supabase_service_key)


def reconcile_ultimo_contato(sb: Client, dry_run: bool) -> int:
    """Alinha clientes.ultimo_contato com o histórico WhatsApp mais recente."""
    historicos = (
        sb.table("historico_contatos")
        .select("cliente_id, data_contato")
        .eq("tipo", "WHATSAPP")
        .order("data_contato", desc=True)
        .execute()
    ).data or []

    latest: dict[str, str] = {}
    for row in historicos:
        cid = row["cliente_id"]
        if cid not in latest:
            latest[cid] = row["data_contato"]

    updated = 0
    for cliente_id, ts in latest.items():
        cliente = (
            sb.table("clientes").select("ultimo_contato").eq("id", cliente_id).maybeSingle().execute()
        ).data
        if not cliente:
            continue
        if (cliente.get("ultimo_contato") or "") < ts:
            log.info("cliente=%s ultimo_contato: %s -> %s", cliente_id, cliente.get("ultimo_contato"), ts)
            if not dry_run:
                sb.table("clientes").update({"ultimo_contato": ts}).eq("id", cliente_id).execute()
            updated += 1
    return updated


def flag_stale_leads(sb: Client, dry_run: bool) -> int:
    """Cria alerta para leads ativos sem contato recente."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=STALE_HOURS)).isoformat()
    leads: list[dict[str, Any]] = (
        sb.table("clientes")
        .select("id, nome, corretor_id, classificacao, ultimo_contato")
        .in_("classificacao", ["quente", "morno"])
        .lte("ultimo_contato", cutoff)
        .execute()
    ).data or []

    created = 0
    for lead in leads:
        # evita duplicar alerta aberto do mesmo tipo
        existing = (
            sb.table("alertas")
            .select("id")
            .eq("cliente_id", lead["id"])
            .eq("tipo", "LEAD_SEM_FOLLOWUP")
            .eq("lido", False)
            .limit(1)
            .execute()
        ).data
        if existing:
            continue

        payload = {
            "cliente_id": lead["id"],
            "corretor_id": lead["corretor_id"],
            "tipo": "LEAD_SEM_FOLLOWUP",
            "mensagem": f"{lead['nome']} ({lead['classificacao']}) sem contato há >{STALE_HOURS}h",
            "lido": False,
        }
        log.info("alerta stale: cliente=%s", lead["id"])
        if not dry_run:
            sb.table("alertas").insert(payload).execute()
        created += 1
    return created


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = Settings.from_env()
    sb = get_client(cfg)

    try:
        reconciled = reconcile_ultimo_contato(sb, args.dry_run)
        alerts = flag_stale_leads(sb, args.dry_run)
    except Exception as exc:  # noqa: BLE001
        log.exception("Falha na sincronização: %s", exc)
        return 1

    log.info("clientes atualizados=%d alertas novos=%d dry_run=%s", reconciled, alerts, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
