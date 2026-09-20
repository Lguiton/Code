"""Compliance-log ingestion: validated image upload + AI evaluation."""

import logging
import uuid
from pathlib import Path

import filetype
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_operator
from app.core.config import get_settings
from app.db import models
from app.db.session import get_db
from app.services.vision_agent import evaluate_compliance_asset

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingestion", tags=["Ingestion"])

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_LOG_TYPES = {"GREASE_TRAP", "ORGANIC_WASTE"}
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _validate_image(data: bytes, declared_type: str | None) -> str:
    """Validate size and sniff the real content type. Returns the verified MIME."""
    settings = get_settings()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {settings.MAX_UPLOAD_MB} MB)",
        )
    kind = filetype.guess(data)
    if kind is None or kind.mime not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=400, detail="File is not a supported image (jpeg/png/webp)"
        )
    if declared_type and declared_type not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(status_code=400, detail="Unsupported content type")
    return kind.mime


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_compliance_log(
    log_type: str = Form(...),
    photo: UploadFile = File(...),
    operator: dict = Depends(get_current_operator),
    db: Session = Depends(get_db),
):
    settings = get_settings()

    if log_type not in ALLOWED_LOG_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid log_type. Allowed: {sorted(ALLOWED_LOG_TYPES)}",
        )

    image_bytes = await photo.read()
    mime = _validate_image(image_bytes, photo.content_type)

    # uuid filename inside the tenant's directory: no path traversal possible.
    tenant_id = operator["tenant_id"]
    filename = f"{uuid.uuid4()}.{_MIME_TO_EXT[mime]}"
    dest_dir = Path(settings.UPLOAD_DIR) / tenant_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(image_bytes)

    try:
        ai_eval = await evaluate_compliance_asset(image_bytes, mime, log_type)
    except RuntimeError as exc:
        logger.error("Vision evaluation unavailable: %s", exc)
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail="Vision service unavailable")
    except Exception:
        logger.exception("Vision evaluation failed")
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail="Vision service error")

    try:
        new_log = models.ComplianceLog(
            tenant_id=tenant_id,
            # Operator identity comes from the signed JWT, not the form.
            operator_id=operator["operator_id"],
            log_type=log_type,
            photo_storage_url=f"/uploads/{tenant_id}/{filename}",
            ai_confidence_score=ai_eval.get("confidence_score", 0.0),
            extracted_volume_gallons=ai_eval.get("extracted_volume_gallons", 0.0),
            structural_integrity_flag=ai_eval.get("structural_integrity_flag", True),
            status=ai_eval.get("status", "FLAGGED"),
            manager_notes=ai_eval.get("manager_notes", ""),
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
    except Exception:
        db.rollback()
        try:
            dest_path.unlink(missing_ok=True)
        except OSError:
            pass
        # Never leak DB internals to the client; the traceback is in the logs.
        logger.exception("Failed to persist compliance log")
        raise HTTPException(status_code=500, detail="Failed to record compliance log")

    return {"status": "success", "log_id": new_log.id, "ai_status": new_log.status}
