"""Create (or reset) a tenant + operator quick-PIN login.

Usage (from backend/):
    python seed_operator.py --tenant "Acme Kitchens" --code OP-4099 --name "Maria" --pin 1234

Requires DATABASE_URL and JWT_SECRET in the environment (or backend/.env).
Prints the tenant id to use as NEXT_PUBLIC_TENANT_ID in the frontend.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.api.auth import hash_pin
from app.core.config import get_settings
from app.db import models
from app.db.session import SessionLocal, engine


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a tenant and operator PIN login.")
    parser.add_argument("--tenant", required=True, help="Tenant display name")
    parser.add_argument("--code", required=True, help="Operator code, e.g. OP-4099")
    parser.add_argument("--name", required=True, help="Operator display name")
    parser.add_argument("--pin", required=True, help="Numeric PIN (4-12 digits)")
    args = parser.parse_args()

    if not args.pin.isdigit() or not 4 <= len(args.pin) <= 12:
        parser.error("PIN must be 4-12 digits")

    get_settings()  # fail fast if secrets are missing/misconfigured
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        tenant = db.query(models.Tenant).filter(models.Tenant.name == args.tenant).first()
        if tenant is None:
            tenant = models.Tenant(name=args.tenant)
            db.add(tenant)
            db.flush()
            print(f"Created tenant '{args.tenant}'")

        operator = (
            db.query(models.Operator)
            .filter(
                models.Operator.tenant_id == tenant.id,
                models.Operator.operator_code == args.code,
            )
            .first()
        )
        if operator is None:
            operator = models.Operator(
                tenant_id=tenant.id,
                operator_code=args.code,
                name=args.name,
                pin_hash=hash_pin(args.pin),
            )
            db.add(operator)
            print(f"Created operator '{args.code}'")
        else:
            operator.pin_hash = hash_pin(args.pin)
            operator.name = args.name
            operator.is_active = True
            print(f"Reset PIN for operator '{args.code}'")

        db.commit()
        print(f"Done. Tenant ID for frontend (NEXT_PUBLIC_TENANT_ID)={tenant.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
