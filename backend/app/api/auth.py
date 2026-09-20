"""Operator authentication: quick-PIN login issuing short-lived JWTs."""

import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db import models
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class PinLoginRequest(BaseModel):
    tenant_id: str = Field(min_length=1, max_length=36)
    operator_code: str = Field(min_length=1, max_length=50)
    pin: str = Field(min_length=4, max_length=12, pattern=r"^\d+$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    operator_id: str
    operator_code: str
    tenant_id: str


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))


def create_access_token(*, tenant_id: str, operator_id: str, operator_code: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "tenant_id": tenant_id,
        "operator_id": operator_id,
        "operator_code": operator_code,
        "iat": now,
        "exp": now + timedelta(hours=settings.JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/pin-login", response_model=TokenResponse)
def pin_login(body: PinLoginRequest, db: Session = Depends(get_db)):
    operator = (
        db.query(models.Operator)
        .filter(
            models.Operator.tenant_id == body.tenant_id,
            models.Operator.operator_code == body.operator_code,
            models.Operator.is_active.is_(True),
        )
        .first()
    )
    # Deliberately identical response whether the code or the PIN was wrong.
    if operator is None or not verify_pin(body.pin, operator.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(
        tenant_id=operator.tenant_id,
        operator_id=operator.id,
        operator_code=operator.operator_code,
    )
    logger.info(
        "Operator %s logged in (tenant %s)", operator.operator_code, operator.tenant_id
    )
    return TokenResponse(
        access_token=token,
        operator_id=operator.id,
        operator_code=operator.operator_code,
        tenant_id=operator.tenant_id,
    )
