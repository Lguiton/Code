import logging
from datetime import datetime, timezone

import duckdb
import pandas as pd
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db import models

logger = logging.getLogger(__name__)


def generate_tenant_monthly_report(tenant_id: str) -> pd.DataFrame:
    """Zero-ETL analytical aggregation over Postgres via DuckDB.

    ``tenant_id`` is passed as a bound parameter — never interpolated into the
    SQL string — so a malicious tenant identifier cannot break out of the query.
    """
    settings = get_settings()

    con = duckdb.connect()
    try:
        con.execute("INSTALL postgres;")
        con.execute("LOAD postgres;")

        # DATABASE_URL is operator-controlled server config, not user input.
        con.execute(f"ATTACH '{settings.DATABASE_URL}' AS pg_db (TYPE postgres);")

        query = """
            SELECT
                log_type,
                COUNT(*) AS total_logs_submitted,
                SUM(extracted_volume_gallons) AS total_volume_processed,
                AVG(ai_confidence_score) AS average_ai_confidence,
                COUNT(CASE WHEN structural_integrity_flag = false THEN 1 END) AS flagged_structural_issues
            FROM pg_db.compliance_logs
            WHERE tenant_id = ?
              AND status = 'VERIFIED'
              AND timestamp >= date_trunc('month', current_date)
            GROUP BY log_type;
        """
        return con.execute(query, [tenant_id]).df()
    finally:
        con.close()


if __name__ == "__main__":
    print("Executing DuckDB analytical query over Postgres...")
    print(generate_tenant_monthly_report("tenant-alpha-001").head())


# ---------------------------------------------------------------------------
# ORM-based reporting (works on any database, including sqlite in tests).
# ---------------------------------------------------------------------------

def _month_start_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)


def get_tenant_summary(db: Session, tenant_id: str) -> dict:
    """Dashboard aggregates for one tenant: totals, rates, and recent activity."""
    base = db.query(models.ComplianceLog).filter(
        models.ComplianceLog.tenant_id == tenant_id
    )

    total = base.count()

    by_status_rows = (
        db.query(models.ComplianceLog.status, func.count(models.ComplianceLog.id))
        .filter(models.ComplianceLog.tenant_id == tenant_id)
        .group_by(models.ComplianceLog.status)
        .all()
    )
    by_status = {status or "UNKNOWN": count for status, count in by_status_rows}

    avg_confidence = (
        db.query(func.avg(models.ComplianceLog.ai_confidence_score))
        .filter(models.ComplianceLog.tenant_id == tenant_id)
        .scalar()
    )
    total_volume = (
        db.query(func.sum(models.ComplianceLog.extracted_volume_gallons))
        .filter(models.ComplianceLog.tenant_id == tenant_id)
        .scalar()
    )
    structural_flags = base.filter(
        models.ComplianceLog.structural_integrity_flag.is_(False)
    ).count()

    by_type_rows = (
        db.query(
            models.ComplianceLog.log_type,
            func.count(models.ComplianceLog.id),
            func.sum(
                case(
                    (models.ComplianceLog.status == "VERIFIED", 1), else_=0
                )
            ),
        )
        .filter(models.ComplianceLog.tenant_id == tenant_id)
        .group_by(models.ComplianceLog.log_type)
        .all()
    )
    by_log_type = {
        log_type or "UNKNOWN": {"total": total_n, "verified": verified_n or 0}
        for log_type, total_n, verified_n in by_type_rows
    }

    recent_rows = (
        db.query(models.ComplianceLog, models.Operator.operator_code)
        .outerjoin(
            models.Operator, models.Operator.id == models.ComplianceLog.operator_id
        )
        .filter(models.ComplianceLog.tenant_id == tenant_id)
        .order_by(models.ComplianceLog.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_logs = [
        {
            "id": log.id,
            "log_type": log.log_type,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "status": log.status,
            "operator_code": operator_code,
            "photo_storage_url": log.photo_storage_url,
            "ai_confidence_score": log.ai_confidence_score,
        }
        for log, operator_code in recent_rows
    ]

    verified = by_status.get("VERIFIED", 0)
    return {
        "tenant_id": tenant_id,
        "total_logs": total,
        "by_status": by_status,
        "verification_rate": (verified / total) if total else 0.0,
        "avg_confidence": float(avg_confidence) if avg_confidence is not None else None,
        "total_volume_gallons": float(total_volume) if total_volume is not None else 0.0,
        "structural_flags": structural_flags,
        "by_log_type": by_log_type,
        "recent_logs": recent_logs,
    }


def get_monthly_log_rows(db: Session, tenant_id: str) -> list[dict]:
    """All of the current month's logs for one tenant, newest first."""
    month_start = _month_start_utc()
    rows = (
        db.query(models.ComplianceLog, models.Operator.operator_code)
        .outerjoin(
            models.Operator, models.Operator.id == models.ComplianceLog.operator_id
        )
        .filter(
            models.ComplianceLog.tenant_id == tenant_id,
            models.ComplianceLog.timestamp >= month_start,
        )
        .order_by(models.ComplianceLog.timestamp.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "log_type": log.log_type,
            "status": log.status,
            "operator_code": operator_code,
            "ai_confidence_score": log.ai_confidence_score,
            "extracted_volume_gallons": log.extracted_volume_gallons,
            "structural_integrity_flag": log.structural_integrity_flag,
            "manager_notes": log.manager_notes,
            "reviewed_by": log.reviewed_by,
            "reviewed_at": log.reviewed_at,
        }
        for log, operator_code in rows
    ]


def build_monthly_pdf(tenant_name: str, month_label: str, rows: list[dict]) -> bytes:
    """Render an audit-ready monthly compliance report as PDF bytes."""
    from fpdf import FPDF

    pdf = FPDF(format="Letter")
    pdf.set_auto_page_break(True, margin=20)
    pdf.add_page()

    def heading(text: str, size: int = 16):
        pdf.set_font("Helvetica", "B", size)
        pdf.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")

    def body(text: str, size: int = 10):
        pdf.set_font("Helvetica", "", size)
        pdf.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")

    def rule():
        pdf.set_draw_color(200, 200, 200)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.ln(4)

    heading("Eivanta Monthly Compliance Report")
    body(f"Tenant: {tenant_name}")
    body(f"Period: {month_label}")
    body(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    rule()

    # Aggregate by log type.
    agg: dict[str, dict] = {}
    for r in rows:
        lt = r["log_type"] or "UNKNOWN"
        a = agg.setdefault(
            lt,
            {"total": 0, "verified": 0, "flagged": 0, "volume": 0.0, "conf_sum": 0.0, "conf_n": 0},
        )
        a["total"] += 1
        if r["status"] == "VERIFIED":
            a["verified"] += 1
        if r["status"] == "FLAGGED":
            a["flagged"] += 1
        a["volume"] += r["extracted_volume_gallons"] or 0.0
        if r["ai_confidence_score"] is not None:
            a["conf_sum"] += r["ai_confidence_score"]
            a["conf_n"] += 1

    heading("Summary by log type", 13)
    col_widths = [52, 24, 24, 24, 32, 34]
    headers = ["Log type", "Logs", "Verified", "Flagged", "Volume (gal)", "Avg conf."]
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 8, h, border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 10)
    if not agg:
        pdf.cell(sum(col_widths), 8, "No logs recorded this month.", border=1)
        pdf.ln()
    for lt in sorted(agg):
        a = agg[lt]
        avg_conf = f"{a['conf_sum'] / a['conf_n']:.2f}" if a["conf_n"] else "-"
        for w, val in zip(
            col_widths,
            [lt, str(a["total"]), str(a["verified"]), str(a["flagged"]),
             f"{a['volume']:.1f}", avg_conf],
        ):
            pdf.cell(w, 8, val, border=1)
        pdf.ln()
    pdf.ln(4)

    needs_review = [r for r in rows if r["status"] in ("FLAGGED", "PENDING")]
    heading("Items needing manager review", 13)
    if not needs_review:
        body("None — every log this month has a final verdict.")
    else:
        for r in needs_review:
            ts = r["timestamp"].strftime("%Y-%m-%d %H:%M") if r["timestamp"] else "?"
            conf = f"{r['ai_confidence_score']:.2f}" if r["ai_confidence_score"] is not None else "-"
            struct = "" if r["structural_integrity_flag"] else " [STRUCTURAL FLAG]"
            body(
                f"- {ts} | {r['log_type']} | {r['status']} | "
                f"op {r['operator_code'] or '?'} | conf {conf}{struct}"
            )
    pdf.ln(4)

    heading("All logs", 13)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(240, 240, 240)
    for w, h in zip([34, 30, 26, 30, 70], ["Date", "Type", "Status", "Operator", "Notes"]):
        pdf.cell(w, 7, h, border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    if not rows:
        pdf.cell(190, 7, "No logs recorded this month.", border=1)
        pdf.ln()
    for r in rows:
        ts = r["timestamp"].strftime("%Y-%m-%d") if r["timestamp"] else "?"
        notes = (r["manager_notes"] or "")[:60]
        for w, val in zip(
            [34, 30, 26, 30, 70],
            [ts, r["log_type"] or "-", r["status"] or "-", r["operator_code"] or "-", notes],
        ):
            # Strip non-latin-1 chars: the built-in font only covers latin-1.
            pdf.cell(w, 7, val.encode("latin-1", "replace").decode("latin-1"), border=1)
        pdf.ln()

    pdf.set_y(-15)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 10, f"Page {pdf.page_no()}/{{nb}}", align="C")
    pdf.alias_nb_pages()

    out = pdf.output()
    return bytes(out)
