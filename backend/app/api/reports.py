"""Tenant-scoped analytical reports."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_operator
from app.db import models
from app.db.session import get_db
from app.services.reporting import (
    build_monthly_pdf,
    generate_tenant_monthly_report,
    get_monthly_log_rows,
    get_tenant_summary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly")
def monthly_report(operator: dict = Depends(get_current_operator)):
    """Monthly compliance aggregates for the caller's tenant only."""
    try:
        df = generate_tenant_monthly_report(operator["tenant_id"])
    except Exception:
        logger.exception("Monthly report generation failed")
        raise HTTPException(status_code=500, detail="Report generation failed")
    rows = df.astype(object).where(df.notnull(), None).to_dict(orient="records")
    return {"tenant_id": operator["tenant_id"], "rows": rows}


@router.get("/summary")
def summary(
    operator: dict = Depends(get_current_operator),
    db: Session = Depends(get_db),
):
    """Dashboard aggregates for the caller's tenant (any database backend)."""
    return get_tenant_summary(db, operator["tenant_id"])


@router.get("/monthly.pdf")
def monthly_pdf(
    operator: dict = Depends(get_current_operator),
    db: Session = Depends(get_db),
):
    """Audit-ready monthly compliance report as a downloadable PDF."""
    tenant = (
        db.query(models.Tenant)
        .filter(models.Tenant.id == operator["tenant_id"])
        .first()
    )
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    rows = get_monthly_log_rows(db, operator["tenant_id"])
    month_label = datetime.now(timezone.utc).strftime("%B %Y")
    try:
        pdf_bytes = build_monthly_pdf(tenant.name, month_label, rows)
    except Exception:
        logger.exception("Monthly PDF generation failed")
        raise HTTPException(status_code=500, detail="PDF generation failed")
    filename = f"eivanta-compliance-{datetime.now(timezone.utc):%Y-%m}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
