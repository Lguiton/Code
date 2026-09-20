"""Tenant-scoped analytical reports."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_operator
from app.services.reporting import generate_tenant_monthly_report

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
