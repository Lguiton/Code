import os
import base64
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from fastapi import UploadFile

class ComplianceExtraction(BaseModel):
    is_valid_asset: bool = Field(description="True if image shows correct compliance asset.")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0.")
    extracted_volume_gallons: float = Field(description="Estimated volume in gallons.")
    structural_integrity_flag: bool = Field(description="False if visible damage. True otherwise.")
    status: str = Field(description="Must be 'VERIFIED' or 'FLAGGED'.")
    manager_notes: str = Field(description="Explanation if FLAGGED.")

async def evaluate_compliance_asset(photo: UploadFile, log_type: str) -> dict:
    api_key = os.getenv("GOOGLE_API_KEY")
    
    # 1. THE MOCK BYPASS
    if not api_key or api_key == "your_actual_gemini_api_key_here":
        print("\n[DEV MODE] No Gemini API key detected. Using Mock AI Response.\n")
        return {
            "is_valid_asset": True,
            "confidence_score": 0.98,
            "extracted_volume_gallons": 42.5,
            "structural_integrity_flag": True,
            "status": "VERIFIED",
            "manager_notes": ""
        }

    # 2. THE PRODUCTION EXECUTION
    image_data = await photo.read()
    image_b64 = base64.b64encode(image_data).decode("utf-8")
    await photo.seek(0)
    
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, api_key=api_key)
    structured_llm = llm.with_structured_output(ComplianceExtraction)
    
    prompt = f"You are a strict municipal health inspector. Analyze this image for a {log_type} compliance log. Extract the required metrics exactly as requested."
    
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{photo.content_type};base64,{image_b64}"}}
        ]
    )
    
    result = structured_llm.invoke([message])
    return result.model_dump()