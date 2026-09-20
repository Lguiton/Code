from datetime import datetime
import uuid
from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to logs
    logs = relationship("ComplianceLog", back_populates="tenant")
    operators = relationship("Operator", back_populates="tenant")

class Operator(Base):
    """A kitchen worker who can log in with a quick-PIN and submit compliance logs.

    PINs are never stored; only bcrypt hashes. operator_code is unique per tenant
    (e.g. 'OP-4099') so kiosk tablets can identify workers with a short code.
    """
    __tablename__ = "operators"
    __table_args__ = (UniqueConstraint("tenant_id", "operator_code", name="uq_operator_tenant_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    operator_code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="operators")

class ComplianceLog(Base):
    __tablename__ = "compliance_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Strict Tenant Isolation 
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    operator_id: Mapped[str] = mapped_column(String(50), nullable=False)
    log_type: Mapped[str] = mapped_column(String(20)) # e.g., 'GREASE_TRAP', 'ORGANIC_WASTE'
    
    photo_storage_url: Mapped[str] = mapped_column(String(512), nullable=True)
    ai_confidence_score: Mapped[float] = mapped_column(Float, nullable=True)
    extracted_volume_gallons: Mapped[float] = mapped_column(Float, nullable=True)
    structural_integrity_flag: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING") # VERIFIED, FLAGGED, OVERRIDDEN
    manager_notes: Mapped[str] = mapped_column(Text, nullable=True)
    # Manager review audit trail: who cleared/overrode the AI verdict, and when.
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="logs")