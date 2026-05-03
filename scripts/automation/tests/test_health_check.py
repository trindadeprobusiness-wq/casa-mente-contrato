"""Smoke tests — garantem que os módulos importam e helpers básicos funcionam."""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
os.environ.setdefault("EVOLUTION_API_KEY", "test-key")

import evolution_health_check as hc  # noqa: E402


def test_connection_state_from_root():
    assert hc.connection_state({"connectionStatus": "open"}) == "open"


def test_connection_state_from_nested():
    assert hc.connection_state({"instance": {"state": "close"}}) == "close"


def test_connection_state_unknown():
    assert hc.connection_state({}) == "unknown"


def test_healthy_states_contains_open():
    assert "open" in hc.HEALTHY_STATES
