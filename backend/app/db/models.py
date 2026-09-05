from datetime import datetime
import uuid
from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean, Text
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

    tenant = relationship("Tenant", back_populates="logs")