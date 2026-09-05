from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.db.session import get_db, engine
from app.db import models
from app.services.vision_agent import evaluate_compliance_asset
from app.api.dependencies import get_current_tenant
import uuid

models.Base.metadata.create_all(bind=engine)

ingestion_router = APIRouter(prefix="/ingestion", tags=["Ingestion"])

@ingestion_router.post("/upload")
async def upload_compliance_log(
    operator_id: str = Form(...),
    log_type: str = Form(...),
    photo: UploadFile = File(...),
    tenant_id: str = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    try:
        ai_eval = await evaluate_compliance_asset(photo, log_type)
        
        new_log = models.ComplianceLog(
            tenant_id=tenant_id,
            operator_id=operator_id,
            log_type=log_type,
            photo_storage_url=f"/s3-bucket/kitchens/{uuid.uuid4()}.jpg",
            ai_confidence_score=ai_eval.get("confidence_score", 0.0),
            extracted_volume_gallons=ai_eval.get("extracted_volume_gallons", 0.0),
            structural_integrity_flag=ai_eval.get("structural_integrity_flag", True),
            status=ai_eval.get("status", "FLAGGED"),
            manager_notes=ai_eval.get("manager_notes", "")
        )
        
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        
        return {"status": "success", "log_id": new_log.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

def create_app() -> FastAPI:
    app = FastAPI(title="Eivanta Code API")
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"], 
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
    )
    api_router = APIRouter(prefix="/api/v1")
    api_router.include_router(ingestion_router)
    app.include_router(api_router)
    return app

app = create_app()