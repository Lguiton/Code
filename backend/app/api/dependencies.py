from fastapi import Header, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-eivanta-dev-key")
ALGORITHM = "HS256"

async def get_current_tenant(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    Decodes the JWT token and extracts the tenant_id.
    This guarantees that the API strictly controls data isolation.
    """
    token = credentials.credentials
    try:
        # In a real system, you'd fetch public keys from Auth0/Supabase here
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        tenant_id: str = payload.get("tenant_id")
        
        if tenant_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing tenant_id")
            
        return tenant_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")