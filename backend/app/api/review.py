"""Manager review workflow: inspect AI-flagged logs and record decisions.

Operators submit compliance logs from the kiosk; the vision agent marks each
one VERIFIED or FLAGGED. A manager then works through the flagged queue here,
approving (VERIFIED) or overriding (OVERRIDDEN) each verdict. Every decision
is stamped with the reviewer's operator id and timestamp for the audit trail.

All queries are scoped to the caller's tenant from the signed JWT.
"""

import logging
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_operator
from app.db import models
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/review", tags=["Review"])

REVIEWABLE_STATUSES = {"FLAGGED", "PENDING"}
QUEUE_STATUSES = {"FLAGGED", "PENDING"}


class ReviewQueueItem(BaseModel):
    id: str
    log_type: str | None
    timestamp: datetime | None
    status: str | None
    photo_storage_url: str | None
    ai_confidence_score: float | None
    extracted_volume_gallons: float | None
    structural_integrity_flag: bool | None
    manager_notes: str | None
    operator_code: str | None
    operator_name: str | None


class ReviewDecisionRequest(BaseModel):
    decision: Literal["approve", "override"]
    manager_notes: str | None = Field(default=None, max_length=2000)


class ReviewDecisionResponse(BaseModel):
    log_id: str
    status: str
    reviewed_by: str
    reviewed_at: datetime


def _item_from_log(log: models.ComplianceLog, operator: models.Operator | None) -> ReviewQueueItem:
    return ReviewQueueItem(
        id=log.id,
        log_type=log.log_type,
        timestamp=log.timestamp,
        status=log.status,
        photo_storage_url=log.photo_storage_url,
        ai_confidence_score=log.ai_confidence_score,
        extracted_volume_gallons=log.extracted_volume_gallons,
        structural_integrity_flag=log.structural_integrity_flag,
        manager_notes=log.manager_notes,
        operator_code=operator.operator_code if operator else None,
        operator_name=operator.name if operator else None,
    )


@router.get("/queue", response_model=list[ReviewQueueItem])
def review_queue(
    status_filter: Literal["FLAGGED", "PENDING"] = Query(default="FLAGGED", alias="status"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    operator: dict = Depends(get_current_operator),
    db: Session = Depends(get_db),
):
    """Newest-first list of logs awaiting manager review for this tenant."""
    logs = (
        db.query(models.ComplianceLog)
        .filter(
            models.ComplianceLog.tenant_id == operator["tenant_id"],
            models.ComplianceLog.status == status_filter,
        )
        .order_by(models.ComplianceLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    submitter_ids = {log.operator_id for log in logs}
    submitters = (
        db.query(models.Operator)
        .filter(models.Operator.id.in_(submitter_ids))
        .all()
        if submitter_ids
        else []
    )
    by_id = {op.id: op for op in submitters}
    return [_item_from_log(log, by_id.get(log.operator_id)) for log in logs]


@router.post("/{log_id}/decision", response_model=ReviewDecisionResponse)
def submit_decision(
    log_id: str,
    body: ReviewDecisionRequest,
    operator: dict = Depends(get_current_operator),
    db: Session = Depends(get_db),
):
    """Record a manager's decision on one flagged log.

    ``approve`` marks the AI verdict correct (VERIFIED); ``override`` records
    a manager correction (OVERRIDDEN) and requires an explanatory note.
    """
    log = (
        db.query(models.ComplianceLog)
        .filter(
            models.ComplianceLog.id == log_id,
            models.ComplianceLog.tenant_id == operator["tenant_id"],
        )
        .first()
    )
    # 404 either way: never reveal whether a log id belongs to another tenant.
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")

    if log.status not in REVIEWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Log already reviewed (status={log.status})",
        )

    notes = (body.manager_notes or "").strip()
    if body.decision == "override" and not notes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="manager_notes is required when overriding an AI verdict",
        )

    log.status = "VERIFIED" if body.decision == "approve" else "OVERRIDDEN"
    if notes:
        existing = (log.manager_notes or "").strip()
        log.manager_notes = f"{existing}\n[review] {notes}".strip() if existing else notes
    log.reviewed_by = operator["operator_id"]
    log.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(log)

    logger.info(
        "Operator %s %s log %s (tenant %s)",
        operator["operator_code"],
        body.decision,
        log_id,
        operator["tenant_id"],
    )
    return ReviewDecisionResponse(
        log_id=log.id,
        status=log.status,
        reviewed_by=log.reviewed_by,
        reviewed_at=log.reviewed_at,
    )
