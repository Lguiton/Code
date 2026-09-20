'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  getReviewQueue,
  submitDecision,
  assetUrl,
  type ReviewQueueItem,
} from '@/lib/api';
import { StatusBadge } from './ComplianceDashboard';

function ReviewCard({
  item,
  token,
  onDecided,
}: {
  item: ReviewQueueItem;
  token: string;
  onDecided: (id: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overriding, setOverriding] = useState(false);

  const decide = async (decision: 'approve' | 'override') => {
    setBusy(true);
    setError(null);
    try {
      await submitDecision(token, item.id, decision, notes || undefined);
      onDecided(item.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-5">
      {assetUrl(item.photo_storage_url) ? (
        <img
          src={assetUrl(item.photo_storage_url)!}
          alt="Evidence photo"
          className="w-full sm:w-44 h-44 sm:h-32 rounded-xl object-cover border border-slate-800"
        />
      ) : (
        <div className="w-full sm:w-44 h-32 rounded-xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
          No photo
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} />
          <span className="text-sm font-semibold text-white">
            {(item.log_type ?? 'LOG').replace(/_/g, ' ')}
          </span>
          {item.structural_integrity_flag === false && (
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              STRUCTURAL FLAG
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
          {' · '}
          {item.operator_name ?? item.operator_code ?? 'Unknown operator'}
          {item.ai_confidence_score != null &&
            ` · AI confidence ${(item.ai_confidence_score * 100).toFixed(0)}%`}
          {item.extracted_volume_gallons != null &&
            ` · ${item.extracted_volume_gallons.toFixed(1)} gal`}
        </p>
        {item.manager_notes && (
          <p className="text-xs text-slate-400 mt-2 italic">“{item.manager_notes}”</p>
        )}

        {overriding ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is the AI verdict wrong? (required)"
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                disabled={busy || !notes.trim()}
                onClick={() => decide('override')}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'Confirm override'}
              </button>
              <button
                disabled={busy}
                onClick={() => setOverriding(false)}
                className="px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button
              disabled={busy}
              onClick={() => decide('approve')}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Approve'}
            </button>
            <button
              disabled={busy}
              onClick={() => setOverriding(true)}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            >
              Override
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default function ReviewQueue({ token }: { token: string }) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'FLAGGED' | 'PENDING'>('FLAGGED');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getReviewQueue(token, statusFilter));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecided = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['FLAGGED', 'PENDING'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
              statusFilter === s
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-2">
          {items.length} awaiting decision
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading review queue…</p>
      ) : items.length === 0 ? (
        <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-slate-300 font-semibold">Queue is clear 🎉</p>
          <p className="text-sm text-slate-500 mt-1">
            Every {statusFilter.toLowerCase()} log has a manager decision.
          </p>
        </div>
      ) : (
        items.map((item) => (
          <ReviewCard key={item.id} item={item} token={token} onDecided={handleDecided} />
        ))
      )}
    </div>
  );
}
