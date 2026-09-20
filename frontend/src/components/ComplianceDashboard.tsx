'use client';
import { useEffect, useState } from 'react';
import { getSummary, assetUrl, type ComplianceSummary } from '@/lib/api';

export function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FLAGGED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    PENDING: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    OVERRIDDEN: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };
  const cls = styles[status ?? ''] ?? styles.PENDING;
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${cls}`}>
      {status ?? 'UNKNOWN'}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        {label}
      </h3>
      <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}

export default function ComplianceDashboard({ token }: { token: string }) {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSummary(token)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
        {error}
      </div>
    );
  }
  if (!summary) {
    return <p className="text-slate-500 text-sm">Loading compliance overview…</p>;
  }

  const rate = Math.round(summary.verification_rate * 100);
  const flagged = (summary.by_status.FLAGGED ?? 0) + (summary.by_status.PENDING ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Verification rate"
          value={`${rate}%`}
          sub={`${summary.by_status.VERIFIED ?? 0} of ${summary.total_logs} logs verified`}
        />
        <StatCard
          label="Awaiting review"
          value={String(flagged)}
          sub="Flagged or pending AI verdicts"
        />
        <StatCard
          label="Volume processed"
          value={`${summary.total_volume_gallons.toFixed(1)} gal`}
          sub="Extracted from evidence photos"
        />
        <StatCard
          label="Structural flags"
          value={String(summary.structural_flags)}
          sub="Photos showing possible damage"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            By log type
          </h3>
          {Object.keys(summary.by_log_type).length === 0 ? (
            <p className="text-sm text-slate-500">No logs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold text-right">Logs</th>
                  <th className="pb-2 font-semibold text-right">Verified</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.by_log_type).map(([type, v]) => (
                  <tr key={type} className="border-t border-slate-800/60">
                    <td className="py-2 text-slate-200 font-medium">
                      {type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 text-right text-slate-300">{v.total}</td>
                    <td className="py-2 text-right text-emerald-400 font-semibold">
                      {v.verified}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Recent activity
          </h3>
          {summary.recent_logs.length === 0 ? (
            <p className="text-sm text-slate-500">No logs yet.</p>
          ) : (
            <ul className="space-y-3">
              {summary.recent_logs.map((log) => (
                <li key={log.id} className="flex items-center gap-3">
                  {assetUrl(log.photo_storage_url) ? (
                    <img
                      src={assetUrl(log.photo_storage_url)!}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-slate-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {(log.log_type ?? 'LOG').replace(/_/g, ' ')}
                      <span className="text-slate-500"> · {log.operator_code ?? '?'}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      {log.ai_confidence_score != null &&
                        ` · AI ${(log.ai_confidence_score * 100).toFixed(0)}%`}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
