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

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** Absolute URL for a backend-served asset path (e.g. evidence photos). */
export function assetUrl(path: string | null): string | null {
  if (!path) return null;
  return `${API_URL}${path}`;
}

export interface ComplianceSummary {
  tenant_id: string;
  total_logs: number;
  by_status: Record<string, number>;
  verification_rate: number;
  avg_confidence: number | null;
  total_volume_gallons: number;
  structural_flags: number;
  by_log_type: Record<string, { total: number; verified: number }>;
  recent_logs: Array<{
    id: string;
    log_type: string | null;
    timestamp: string | null;
    status: string | null;
    operator_code: string | null;
    photo_storage_url: string | null;
    ai_confidence_score: number | null;
  }>;
}

export async function getSummary(token: string): Promise<ComplianceSummary> {
  const res = await fetch(`${API_URL}/api/v1/reports/summary`, {
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (!res.ok) throw new Error("Could not load dashboard summary.");
  return res.json();
}

export interface ReviewQueueItem {
  id: string;
  log_type: string | null;
  timestamp: string | null;
  status: string | null;
  photo_storage_url: string | null;
  ai_confidence_score: number | null;
  extracted_volume_gallons: number | null;
  structural_integrity_flag: boolean | null;
  manager_notes: string | null;
  operator_code: string | null;
  operator_name: string | null;
}

export async function getReviewQueue(
  token: string,
  status: "FLAGGED" | "PENDING" = "FLAGGED",
): Promise<ReviewQueueItem[]> {
  const res = await fetch(`${API_URL}/api/v1/review/queue?status=${status}`, {
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (!res.ok) throw new Error("Could not load the review queue.");
  return res.json();
}

export async function submitDecision(
  token: string,
  logId: string,
  decision: "approve" | "override",
  managerNotes?: string,
): Promise<{ log_id: string; status: string }> {
  const res = await fetch(
    `${API_URL}/api/v1/review/${encodeURIComponent(logId)}/decision`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ decision, manager_notes: managerNotes ?? null }),
    },
  );
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (res.status === 404) throw new Error("Log not found.");
  if (res.status === 409) throw new Error("This log was already reviewed.");
  if (res.status === 422)
    throw new Error("An explanatory note is required to override a verdict.");
  if (!res.ok) throw new Error("Could not record the decision.");
  return res.json();
}

export interface MonthlyReportRow {
  log_type: string;
  total_logs_submitted: number;
  total_volume_processed: number | null;
  average_ai_confidence: number | null;
  flagged_structural_issues: number;
}

export async function getMonthlyReport(token: string): Promise<MonthlyReportRow[]> {
  const res = await fetch(`${API_URL}/api/v1/reports/monthly`, {
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (!res.ok) throw new Error("Could not load the monthly report.");
  const data = await res.json();
  return data.rows;
}

/** Downloads the audit-ready monthly PDF via a temporary object URL. */
export async function downloadMonthlyPdf(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/reports/monthly.pdf`, {
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new Error("Session expired — please log in again.");
  if (!res.ok) throw new Error("Could not generate the PDF report.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "eivanta-compliance-report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
