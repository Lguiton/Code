import base64
import logging
import os

from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ComplianceExtraction(BaseModel):
    is_valid_asset: bool = Field(description="True if image shows correct compliance asset.")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0.")
    extracted_volume_gallons: float = Field(description="Estimated volume in gallons.")
    structural_integrity_flag: bool = Field(description="False if visible damage. True otherwise.")
    status: str = Field(description="Must be 'VERIFIED' or 'FLAGGED'.")
    manager_notes: str = Field(description="Explanation if FLAGGED.")


async def evaluate_compliance_asset(image_bytes: bytes, content_type: str, log_type: str) -> dict:
    settings = get_settings()

    # 1. Explicit dev-only mock. Fail closed: results are never silently faked.
    #    (Settings validation refuses MOCK_AI=true when ENVIRONMENT=prod.)
    if settings.MOCK_AI:
        logger.warning("MOCK_AI is enabled — returning fake vision response")
        return {
            "is_valid_asset": True,
            "confidence_score": 0.98,
            "extracted_volume_gallons": 42.5,
            "structural_integrity_flag": True,
            "status": "VERIFIED",
            "manager_notes": "",
        }

    # 2. Production execution
    api_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured and MOCK_AI is disabled.")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, api_key=api_key)
    structured_llm = llm.with_structured_output(ComplianceExtraction)

    prompt = (
        f"You are a strict municipal health inspector. Analyze this image for a {log_type} "
        "compliance log. Extract the required metrics exactly as requested."
    )

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{image_b64}"}},
        ]
    )

    result = structured_llm.invoke([message])
    return result.model_dump()
