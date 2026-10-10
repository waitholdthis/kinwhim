"use client";

import { Ban, Check, Flag, ImageOff, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Report = {
  id: string;
  targetType: "memory" | "photo" | "user";
  targetId: string;
  targetUserId: string | null;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  createdAt: number;
  resolvedAt: number | null;
  reporterName: string | null;
  reporterEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
  reportsAgainstUser: number;
  evidenceUrl: string | null;
};

type Action = "dismiss" | "remove_content" | "suspend_user" | "remove_and_suspend";

const reasonLabels: Record<string, string> = {
  nudity_or_sexual: "Nudity or sexual content",
  harassment_or_bullying: "Harassment or bullying",
  hate_or_violence: "Hate, threats, or violence",
  self_harm: "Self-harm or suicide",
  minor_safety: "Child safety concern",
  impersonation: "Impersonation",
  not_consented: "Photo without consent",
  spam: "Spam",
  other: "Something else",
};

// Most urgent first within the queue.
const urgent = new Set(["minor_safety", "self_harm"]);

export function ModerationDashboard() {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (which: "open" | "resolved") =>
      fetch(`/api/admin/reports?status=${which}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = (await response.json()) as { reports?: Report[]; counts?: Record<string, number>; error?: string };
          if (!response.ok) throw new Error(payload.error || "Couldn’t load reports.");
          setReports(payload.reports ?? []);
          setCounts(payload.counts ?? {});
          setError(null);
        })
        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Couldn’t load reports.")),
    [],
  );

  useEffect(() => {
    void load(status);
  }, [load, status]);

  const sorted = [...(reports ?? [])].sort(
    (a, b) => Number(urgent.has(b.reason)) - Number(urgent.has(a.reason)) || a.createdAt - b.createdAt,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {(["open", "resolved"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            className={`rounded-full px-4 py-2 text-sm font-black capitalize ${status === option ? "bg-[#242117] text-[#fff8e8]" : "border border-[#29251d]/15 bg-white/60"}`}
          >
            {option} · {counts[option] ?? 0}
          </button>
        ))}
        <button onClick={() => void load(status)} className="ml-auto flex items-center gap-2 rounded-full border border-[#29251d]/15 px-4 py-2 text-sm font-bold">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <p className="mt-6 rounded-2xl bg-[#b23b2a] px-5 py-4 font-bold text-white">{error}</p>}
      {!reports && !error && <p className="mt-10 flex items-center gap-2 font-bold"><LoaderCircle className="animate-spin" size={18} /> Loading reports…</p>}
      {reports && sorted.length === 0 && (
        <div className="mt-10 rounded-[28px] bg-[#c9d9c3] p-8 text-center">
          <ShieldCheck className="mx-auto" size={32} />
          <p className="mt-3 font-serif text-2xl font-black">{status === "open" ? "The queue is clear." : "No resolved reports yet."}</p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {sorted.map((report) => (
          <ReportCard key={report.id} report={report} onResolved={() => void load(status)} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, onResolved }: { report: Report; onResolved: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidenceFailed, setEvidenceFailed] = useState(false);
  const open = report.status === "open";
  const hasContent = report.targetType !== "user";

  async function act(action: Action) {
    const label = { dismiss: "Dismiss", remove_content: "Remove the content", suspend_user: "Suspend this account", remove_and_suspend: "Remove the content and suspend" }[action];
    if (action !== "dismiss" && !window.confirm(`${label}? This takes effect immediately.`)) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "That didn’t work.");
      onResolved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn’t work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`grid gap-5 rounded-[28px] border bg-white/70 p-5 sm:grid-cols-[220px_1fr] ${urgent.has(report.reason) && open ? "border-[#b23b2a]" : "border-[#29251d]/10"}`}>
      <div className="aspect-square overflow-hidden rounded-[20px] bg-[#eae2d4]">
        {report.evidenceUrl && !evidenceFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, authenticated image
          <img src={report.evidenceUrl} alt="Reported content" onError={() => setEvidenceFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-sm font-bold text-[#6d675a]">
            <span><ImageOff className="mx-auto mb-2" />{report.targetType === "user" ? "Report about a person" : "No evidence copy"}</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${urgent.has(report.reason) ? "bg-[#b23b2a] text-white" : "bg-[#f5d98b]"}`}>
            {reasonLabels[report.reason] ?? report.reason}
          </span>
          <span className="rounded-full bg-[#eae2d4] px-3 py-1 text-xs font-black uppercase tracking-wider">{report.targetType}</span>
          <span className="text-xs text-[#6d675a]">{new Date(report.createdAt * 1000).toLocaleString()}</span>
        </div>
        <dl className="mt-4 grid gap-1 text-sm">
          <div><dt className="inline font-black">Reported by: </dt><dd className="inline">{report.reporterName ?? "Deleted account"} {report.reporterEmail && <span className="text-[#6d675a]">({report.reporterEmail})</span>}</dd></div>
          {report.targetUserId && (
            <div>
              <dt className="inline font-black">About: </dt>
              <dd className="inline">
                {report.targetName ?? "Deleted account"} {report.targetEmail && <span className="text-[#6d675a]">({report.targetEmail})</span>}
                {report.reportsAgainstUser > 1 && <span className="ml-2 rounded-full bg-[#b23b2a] px-2 py-0.5 text-xs font-black text-white">{report.reportsAgainstUser} reports total</span>}
              </dd>
            </div>
          )}
          {report.details && <div className="mt-2 rounded-2xl bg-[#f6f1e8] p-3 italic">“{report.details}”</div>}
          {!open && <div className="mt-2 font-bold text-[#3f5d42]">Resolved: {report.resolution}</div>}
        </dl>

        {open && (
          <>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder="Note for the record (optional)"
              className="mt-4 w-full rounded-2xl border border-[#29251d]/15 bg-white px-4 py-2.5 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton icon={<Check size={15} />} label="Dismiss" busy={busy === "dismiss"} onClick={() => void act("dismiss")} />
              {hasContent && <ActionButton icon={<Trash2 size={15} />} label="Remove content" busy={busy === "remove_content"} onClick={() => void act("remove_content")} />}
              {report.targetUserId && <ActionButton icon={<Ban size={15} />} label="Suspend account" danger busy={busy === "suspend_user"} onClick={() => void act("suspend_user")} />}
              {hasContent && report.targetUserId && (
                <ActionButton icon={<Flag size={15} />} label="Remove + suspend" danger busy={busy === "remove_and_suspend"} onClick={() => void act("remove_and_suspend")} />
              )}
            </div>
            {error && <p className="mt-3 font-bold text-[#b23b2a]">{error}</p>}
          </>
        )}
      </div>
    </article>
  );
}

function ActionButton({ icon, label, onClick, busy, danger }: { icon: React.ReactNode; label: string; onClick: () => void; busy: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${danger ? "bg-[#b23b2a] text-white" : "border border-[#29251d]/15 bg-white"}`}
    >
      {busy ? <LoaderCircle className="animate-spin" size={15} /> : icon} {label}
    </button>
  );
}
