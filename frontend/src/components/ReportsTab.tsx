'use client';
import { useEffect, useState } from 'react';
import { getMonthlyReport, downloadMonthlyPdf, type MonthlyReportRow } from '@/lib/api';

export default function ReportsTab({ token }: { token: string }) {
  const [rows, setRows] = useState<MonthlyReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMonthlyReport(token)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadMonthlyPdf(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Monthly compliance report</h2>
          <p className="text-sm text-slate-500">
            {monthLabel} · aggregates over verified logs
          </p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 overflow-x-auto">
        {!rows ? (
          <p className="text-slate-500 text-sm">Loading report…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No verified logs this month yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Log type</th>
                <th className="pb-3 font-semibold text-right">Logs</th>
                <th className="pb-3 font-semibold text-right">Volume (gal)</th>
                <th className="pb-3 font-semibold text-right">Avg AI confidence</th>
                <th className="pb-3 font-semibold text-right">Structural issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.log_type} className="border-t border-slate-800/60">
                  <td className="py-3 text-slate-200 font-medium">
                    {r.log_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {r.total_logs_submitted}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {(r.total_volume_processed ?? 0).toFixed(1)}
                  </td>
                  <td className="py-3 text-right text-slate-300">
                    {r.average_ai_confidence != null
                      ? `${(r.average_ai_confidence * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="py-3 text-right">
                    {r.flagged_structural_issues > 0 ? (
                      <span className="text-red-400 font-bold">
                        {r.flagged_structural_issues}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-600">
        The PDF includes the full log listing and every item still awaiting
        manager review — ready to hand to a health inspector.
      </p>
    </div>
  );
}
