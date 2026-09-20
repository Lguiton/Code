import logging
from typing import Any

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)


def _decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "tenant_id", "operator_id"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Could not validate credentials")


async def get_current_operator(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict[str, str]:
    """Decode the JWT and return the operator identity.

    ``tenant_id`` scoping guarantees strict data isolation, and
    ``operator_id`` comes from the signed token — never from
    client-submitted form fields.
    """
    payload = _decode_token(credentials.credentials)
    tenant_id = payload.get("tenant_id")
    operator_id = payload.get("operator_id")
    if not tenant_id or not operator_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {
        "tenant_id": tenant_id,
        "operator_id": operator_id,
        "operator_code": payload.get("operator_code", ""),
    }


async def get_current_tenant(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """Backwards-compatible helper returning only the tenant id."""
    return (await get_current_operator(credentials))["tenant_id"]
