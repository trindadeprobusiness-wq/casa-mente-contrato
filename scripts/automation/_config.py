"""Configuração compartilhada para jobs de automação."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
    load_dotenv(Path(__file__).parents[2] / ".env.local")
except ImportError:
    pass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_key: str
    evolution_base_url: str
    evolution_api_key: str
    evolution_instance: str
    admin_phone: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        required = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            "EVOLUTION_BASE_URL": os.getenv("EVOLUTION_BASE_URL", "http://localhost:8080"),
            "EVOLUTION_API_KEY": os.getenv("EVOLUTION_API_KEY"),
            "EVOLUTION_INSTANCE": os.getenv("EVOLUTION_INSTANCE", "imobiliaria"),
        }
        missing = [k for k, v in required.items() if not v]
        if missing:
            raise RuntimeError(f"Variáveis ausentes: {', '.join(missing)}")
        return cls(
            supabase_url=required["SUPABASE_URL"],
            supabase_service_key=required["SUPABASE_SERVICE_ROLE_KEY"],
            evolution_base_url=required["EVOLUTION_BASE_URL"].rstrip("/"),
            evolution_api_key=required["EVOLUTION_API_KEY"],
            evolution_instance=required["EVOLUTION_INSTANCE"],
            admin_phone=os.getenv("ADMIN_PHONE"),
        )
