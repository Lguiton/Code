"""Feature tests: review workflow, summary dashboard, PDF export, migrations.

Run from backend/:  python -m pytest tests/ -q

The schema is built with `alembic upgrade head` (not create_all), so the
migration chain itself is under test.
"""

import os
import sys
import tempfile
from datetime import datetime, timezone

# --- Environment must be set before any app import (settings are cached). ---
_tmp = tempfile.mkdtemp(prefix="eivanta_test_")
TEST_DB = os.path.join(_tmp, "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["ENVIRONMENT"] = "dev"
os.environ["AUTO_CREATE_TABLES"] = "false"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["ALLOWED_HOSTS"] = "*"
os.environ["CORS_ORIGINS"] = "http://127.0.0.1:3004"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, inspect  # noqa: E402

from app.api.auth import create_access_token, hash_pin  # noqa: E402
from app.db import models  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.main import create_app  # noqa: E402


def _alembic_cfg(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


# Build the schema through the real migration chain, then start the app.
command.upgrade(_alembic_cfg(f"sqlite:///{TEST_DB}"), "head")
client = TestClient(create_app())


def _seed():
    db = SessionLocal()
    try:
        db.query(models.ComplianceLog).delete()
        db.query(models.Operator).delete()
        db.query(models.Tenant).delete()

        tenant_a = models.Tenant(name="Tenant A")
        tenant_b = models.Tenant(name="Tenant B")
        db.add_all([tenant_a, tenant_b])
        db.flush()

        mgr = models.Operator(
            tenant_id=tenant_a.id, operator_code="MGR-1", name="Mara",
            pin_hash=hash_pin("1111"),
        )
        worker = models.Operator(
            tenant_id=tenant_a.id, operator_code="OP-1", name="Owen",
            pin_hash=hash_pin("2222"),
        )
        other_mgr = models.Operator(
            tenant_id=tenant_b.id, operator_code="MGR-9", name="Nina",
            pin_hash=hash_pin("3333"),
        )
        db.add_all([mgr, worker, other_mgr])
        db.flush()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        logs = [
            # tenant A
            models.ComplianceLog(
                tenant_id=tenant_a.id, operator_id=worker.id,
                log_type="GREASE_TRAP", status="VERIFIED",
                ai_confidence_score=0.95, extracted_volume_gallons=40.0,
                structural_integrity_flag=True, timestamp=now,
            ),
            models.ComplianceLog(
                tenant_id=tenant_a.id, operator_id=worker.id,
                log_type="GREASE_TRAP", status="FLAGGED",
                ai_confidence_score=0.42, extracted_volume_gallons=12.5,
                structural_integrity_flag=False, timestamp=now,
                manager_notes="AI unsure",
            ),
            models.ComplianceLog(
                tenant_id=tenant_a.id, operator_id=worker.id,
                log_type="ORGANIC_WASTE", status="PENDING",
                ai_confidence_score=0.71, extracted_volume_gallons=8.0,
                structural_integrity_flag=True, timestamp=now,
            ),
            # tenant B (isolation probe)
            models.ComplianceLog(
                tenant_id=tenant_b.id, operator_id=other_mgr.id,
                log_type="GREASE_TRAP", status="FLAGGED",
                ai_confidence_score=0.10, extracted_volume_gallons=1.0,
                structural_integrity_flag=True, timestamp=now,
            ),
        ]
        db.add_all(logs)
        db.commit()
        ids = {
            "tenant_a": tenant_a.id,
            "tenant_b": tenant_b.id,
            "mgr": mgr.id,
            "worker": worker.id,
            "flagged_a": logs[1].id,
            "pending_a": logs[2].id,
            "flagged_b": logs[3].id,
        }
    finally:
        db.close()
    return ids


def _token(operator_id: str, tenant_id: str, code: str) -> str:
    return create_access_token(
        tenant_id=tenant_id, operator_id=operator_id, operator_code=code
    )


def _auth_headers(operator_id: str, tenant_id: str, code: str) -> dict:
    return {"Authorization": f"Bearer {_token(operator_id, tenant_id, code)}"}


SEED = _seed()
HDRS = _auth_headers(SEED["mgr"], SEED["tenant_a"], "MGR-1")


# --- Review queue -----------------------------------------------------------

def test_review_queue_lists_flagged_tenant_scoped():
    r = client.get("/api/v1/review/queue", headers=HDRS)
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) == 1
    assert items[0]["id"] == SEED["flagged_a"]
    assert items[0]["operator_code"] == "OP-1"
    assert items[0]["structural_integrity_flag"] is False


def test_review_queue_status_filter_and_pagination():
    r = client.get("/api/v1/review/queue?status=PENDING", headers=HDRS)
    assert r.status_code == 200
    assert [i["id"] for i in r.json()] == [SEED["pending_a"]]
    r = client.get("/api/v1/review/queue?limit=1&offset=0", headers=HDRS)
    assert len(r.json()) == 1
    assert client.get("/api/v1/review/queue?status=BOGUS", headers=HDRS).status_code == 422


def test_review_queue_requires_auth():
    assert client.get("/api/v1/review/queue").status_code == 401


def test_approve_decision():
    r = client.post(
        f"/api/v1/review/{SEED['flagged_a']}/decision",
        json={"decision": "approve"},
        headers=HDRS,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "VERIFIED"
    assert body["reviewed_by"] == SEED["mgr"]
    assert body["reviewed_at"]
    # No longer in the queue.
    ids = [i["id"] for i in client.get("/api/v1/review/queue", headers=HDRS).json()]
    assert SEED["flagged_a"] not in ids


def test_override_requires_notes_then_succeeds():
    log_id = SEED["pending_a"]
    r = client.post(
        f"/api/v1/review/{log_id}/decision",
        json={"decision": "override"},
        headers=HDRS,
    )
    assert r.status_code == 422
    r = client.post(
        f"/api/v1/review/{log_id}/decision",
        json={"decision": "override", "manager_notes": "Bin was actually empty."},
        headers=HDRS,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "OVERRIDDEN"


def test_double_review_conflicts():
    r = client.post(
        f"/api/v1/review/{SEED['flagged_a']}/decision",
        json={"decision": "approve"},
        headers=HDRS,
    )
    assert r.status_code == 409


def test_decision_cross_tenant_is_404():
    r = client.post(
        f"/api/v1/review/{SEED['flagged_b']}/decision",
        json={"decision": "approve"},
        headers=HDRS,
    )
    assert r.status_code == 404


def test_decision_unknown_log_is_404():
    r = client.post(
        "/api/v1/review/does-not-exist/decision",
        json={"decision": "approve"},
        headers=HDRS,
    )
    assert r.status_code == 404


# --- Summary ----------------------------------------------------------------

def test_summary_aggregates_and_isolation():
    # NOTE: earlier tests mutated statuses; re-seed for deterministic counts.
    fresh = _seed()
    headers = _auth_headers(fresh["mgr"], fresh["tenant_a"], "MGR-1")
    r = client.get("/api/v1/reports/summary", headers=headers)
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["tenant_id"] == fresh["tenant_a"]
    assert s["total_logs"] == 3
    assert s["by_status"] == {"VERIFIED": 1, "FLAGGED": 1, "PENDING": 1}
    assert abs(s["verification_rate"] - 1 / 3) < 1e-9
    assert abs(s["avg_confidence"] - (0.95 + 0.42 + 0.71) / 3) < 1e-9
    assert abs(s["total_volume_gallons"] - 60.5) < 1e-9
    assert s["structural_flags"] == 1
    assert s["by_log_type"]["GREASE_TRAP"] == {"total": 2, "verified": 1}
    assert s["by_log_type"]["ORGANIC_WASTE"] == {"total": 1, "verified": 0}
    assert len(s["recent_logs"]) == 3
    assert s["recent_logs"][0]["operator_code"] == "OP-1"

    # Tenant B sees only its own log.
    db = SessionLocal()
    try:
        mgr_b = (
            db.query(models.Operator)
            .filter(models.Operator.tenant_id == fresh["tenant_b"])
            .first()
        )
        headers_b = _auth_headers(mgr_b.id, fresh["tenant_b"], mgr_b.operator_code)
    finally:
        db.close()
    s_b = client.get("/api/v1/reports/summary", headers=headers_b).json()
    assert s_b["total_logs"] == 1
    assert s_b["by_status"] == {"FLAGGED": 1}


def test_summary_requires_auth():
    assert client.get("/api/v1/reports/summary").status_code == 401


# --- PDF export --------------------------------------------------------------

def test_monthly_pdf_download():
    fresh = _seed()
    headers = _auth_headers(fresh["mgr"], fresh["tenant_a"], "MGR-1")
    r = client.get("/api/v1/reports/monthly.pdf", headers=headers)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
    assert "attachment" in r.headers["content-disposition"]
    assert len(r.content) > 2000  # real document, not an empty shell


def test_monthly_pdf_requires_auth():
    assert client.get("/api/v1/reports/monthly.pdf").status_code == 401


# --- Migrations ---------------------------------------------------------------

def test_alembic_upgrade_downgrade_cycle():
    scratch = os.path.join(_tmp, "scratch.db")
    url = f"sqlite:///{scratch}"
    cfg = _alembic_cfg(url)

    command.upgrade(cfg, "head")
    cols = {c["name"] for c in inspect(create_engine(url)).get_columns("compliance_logs")}
    assert "reviewed_by" in cols and "reviewed_at" in cols

    command.downgrade(cfg, "0001_baseline")
    cols = {c["name"] for c in inspect(create_engine(url)).get_columns("compliance_logs")}
    assert "reviewed_by" not in cols

    command.upgrade(cfg, "head")  # and back up again


if __name__ == "__main__":
    raise SystemExit("Run with: python -m pytest tests/ -q")
