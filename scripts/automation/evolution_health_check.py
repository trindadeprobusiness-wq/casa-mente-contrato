"""Probe da Evolution API.

- Verifica /instance/fetchInstances
- Se a instância não estiver `open`, tenta reconectar via /instance/connect/{name}
- Se persistir desconectada, envia alerta ao ADMIN_PHONE (se configurado)

Uso:
    python evolution_health_check.py
Exit codes: 0 saudável | 1 erro | 2 instância desconectada sem recuperação
"""
from __future__ import annotations

import logging
import sys
from typing import Any

import httpx

from _config import Settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("evolution-health")

HEALTHY_STATES = {"open"}


def fetch_instance(cfg: Settings, client: httpx.Client) -> dict[str, Any] | None:
    res = client.get(
        f"{cfg.evolution_base_url}/instance/fetchInstances",
        headers={"apikey": cfg.evolution_api_key},
        timeout=10,
    )
    res.raise_for_status()
    payload = res.json()
    items = payload if isinstance(payload, list) else payload.get("instances", [])
    for item in items:
        name = item.get("name") or item.get("instanceName") or item.get("instance", {}).get("instanceName")
        if name == cfg.evolution_instance:
            return item
    return None


def connection_state(entry: dict[str, Any]) -> str:
    return (
        entry.get("connectionStatus")
        or entry.get("state")
        or entry.get("instance", {}).get("state")
        or "unknown"
    ).lower()


def reconnect(cfg: Settings, client: httpx.Client) -> dict[str, Any]:
    res = client.get(
        f"{cfg.evolution_base_url}/instance/connect/{cfg.evolution_instance}",
        headers={"apikey": cfg.evolution_api_key},
        timeout=15,
    )
    res.raise_for_status()
    return res.json()


def notify_admin(cfg: Settings, client: httpx.Client, message: str) -> None:
    if not cfg.admin_phone:
        log.warning("ADMIN_PHONE não configurado; pulando notificação")
        return
    try:
        client.post(
            f"{cfg.evolution_base_url}/message/sendText/{cfg.evolution_instance}",
            headers={"apikey": cfg.evolution_api_key, "Content-Type": "application/json"},
            json={"number": cfg.admin_phone, "text": message},
            timeout=10,
        )
    except httpx.HTTPError as exc:
        log.error("Falha ao notificar admin: %s", exc)


def main() -> int:
    cfg = Settings.from_env()
    with httpx.Client() as client:
        try:
            entry = fetch_instance(cfg, client)
        except httpx.HTTPError as exc:
            log.error("Evolution API inacessível: %s", exc)
            return 1

        if entry is None:
            log.error("Instância %s não existe", cfg.evolution_instance)
            return 2

        state = connection_state(entry)
        log.info("Instância %s em estado '%s'", cfg.evolution_instance, state)

        if state in HEALTHY_STATES:
            return 0

        log.warning("Tentando reconectar...")
        try:
            reconnect(cfg, client)
        except httpx.HTTPError as exc:
            log.error("Reconexão falhou: %s", exc)
            notify_admin(cfg, client, f"[Evolution] reconexão falhou ({cfg.evolution_instance}): {exc}")
            return 2

        notify_admin(
            cfg,
            client,
            f"[Evolution] instância '{cfg.evolution_instance}' estava '{state}'. QR solicitado — escaneie no manager.",
        )
        return 2


if __name__ == "__main__":
    sys.exit(main())
