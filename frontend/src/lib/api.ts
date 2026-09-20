/**
 * Typed client for the Eivanta FastAPI backend.
 *
 * The API base URL comes from NEXT_PUBLIC_API_URL (set in frontend/.env.local).
 * Auth tokens are kept in React state (see AuthContext) — never in localStorage —
 * so a stored XSS payload can't exfiltrate a long-lived session.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export interface AuthState {
  token: string;
  operatorId: string;
  operatorCode: string;
  tenantId: string;
}

export async function pinLogin(
  tenantId: string,
  operatorCode: string,
  pin: string,
): Promise<AuthState> {
  const res = await fetch(`${API_URL}/api/v1/auth/pin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, operator_code: operatorCode, pin }),
  });
  if (res.status === 401) throw new Error("Invalid operator code or PIN.");
  if (!res.ok) throw new Error("Login failed — is the API reachable?");
  const data = await res.json();
  return {
    token: data.access_token,
    operatorId: data.operator_id,
    operatorCode: data.operator_code,
    tenantId: data.tenant_id,
  };
}

export interface UploadResult {
  log_id: string;
  ai_status: string;
}

export async function uploadComplianceLog(
  token: string,
  logType: string,
  photo: Blob,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("photo", photo, "kitchen_capture.jpg");
  formData.append("log_type", logType);

  const res = await fetch(`${API_URL}/api/v1/ingestion/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (res.status === 413) throw new Error("Photo is too large.");
  if (!res.ok) throw new Error("Upload failed — please try again.");
  return res.json();
}
