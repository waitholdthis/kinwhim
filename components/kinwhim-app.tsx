"use client";

import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  Ellipsis,
  Flag,
  Ban,
  UserMinus,
  LogOut,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Settings2,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PrivateImage } from "@/components/private-image";

type Circle = {
  id: string;
  name: string;
  inviteCode: string;
  inviteUrl?: string;
  ownerId: string;
  revealHour: number;
  timezone: string;
  style: string;
};

type Member = {
  id: string;
  name: string;
  role: string;
  checkinId: string | null;
  blocked: boolean;
  checkedIn: boolean;
  photoUrl: string | null;
  mood: string | null;
  caption: string | null;
  consentTransform: boolean;
};

type Memory = {
  id: string;
  day: string;
  mediaUrl: string;
  kind: string;
  title: string;
  createdAt: number;
  reactions: string[];
  isRead: boolean;
  featuresViewer: boolean;
};

type ReportTarget = {
  targetType: "memory" | "photo" | "user";
  targetId: string;
  label: string;
  canBlock: boolean;
};

// Mirrors REPORT_REASONS in lib/policies.ts.
const reportReasons = [
  ["nudity_or_sexual", "Nudity or sexual content"],
  ["harassment_or_bullying", "Harassment or bullying"],
  ["hate_or_violence", "Hate, threats, or violence"],
  ["self_harm", "Self-harm or suicide"],
  ["minor_safety", "Child safety concern"],
  ["impersonation", "Pretending to be someone else"],
  ["not_consented", "A photo of me I didn’t agree to"],
  ["spam", "Spam"],
  ["other", "Something else"],
] as const;

type Dashboard = {
  viewer: { id: string; name: string; email: string; needsTerms: boolean };
  termsVersion: string;
  circles: Circle[];
  circle: Circle | null;
  today?: string;
  members: Member[];
  memories: Memory[];
  unreadCount: number;
  streaks: { circle: number; mine: number };
};

type MovieAsset = {
  memoryId: string;
  blob: Blob;
  url: string;
  fileName: string;
  mimeType: string;
};

const moods = [
  ["sparkly", "✨"],
  ["sleepy", "☁️"],
  ["chaotic", "🌀"],
  ["soft", "🌷"],
  ["victorious", "🏆"],
];
const reactions = ["✨", "😂", "🥹", "🫶", "🔥"];

type ApiPayload = { error?: string; pending?: boolean; circleId?: string; memoryId?: string };

export function KinwhimApp({ user }: { user: { name: string; email: string } }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"today" | "memories" | "circle">("today");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [movieProgress, setMovieProgress] = useState(0);
  const [movieAsset, setMovieAsset] = useState<MovieAsset | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [memberMenu, setMemberMenu] = useState<Member | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const automaticReveal = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (movieAsset) URL.revokeObjectURL(movieAsset.url);
    };
  }, [movieAsset]);

  const load = useCallback(async (circleId?: string) => {
    setError(null);
    const response = await fetch(`/api/dashboard${circleId ? `?circle=${circleId}` : ""}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as Dashboard & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Kinwhim could not wake up.");
    setData(payload);
    setShowOnboarding(!payload.circle);
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    // Read a deep-link invite once on arrival.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoinCode(code?.trim().toUpperCase() || null);
    // Initial data comes from the authenticated Kinwhim API.
    load()
      .then(() => {
        if (code) setShowOnboarding(true);
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [load]);

  const me = data?.members.find((member) => member.id === data.viewer.id);
  const checkedCount = data?.members.filter((member) => member.checkedIn).length ?? 0;
  const allChecked = Boolean(data?.members.length && checkedCount === data.members.length);
  const consentingCount =
    data?.members.filter((member) => member.checkedIn && member.consentTransform).length ?? 0;
  const newestMemory = data?.memories[0] ?? null;
  const hasTodayMemory = Boolean(
    data?.today && data.memories.some((memory) => memory.day === data.today),
  );
  const revealLabel = data?.circle
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: data.circle.timezone,
      }).format(new Date(new Date().setHours(data.circle.revealHour, 0, 0, 0)))
    : "9:00 PM";

  useEffect(() => {
    if (
      !data?.circle ||
      !data.today ||
      !allChecked ||
      consentingCount < 2 ||
      hasTodayMemory ||
      !isPastReveal(data.circle)
    ) {
      return;
    }
    const key = `${data.circle.id}:${data.today}`;
    if (automaticReveal.current === key) return;
    automaticReveal.current = key;
    // The API takes an atomic generation lock, so separate friends can open safely.
    void generateMemory(true);
    // generateMemory intentionally uses this snapshot of the loaded dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allChecked, consentingCount, data, hasTodayMemory]);

  async function createOrJoin(formData: FormData) {
    setBusy("circle");
    setError(null);
    try {
      const action = String(formData.get("action"));
      const response = await fetch("/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          name: formData.get("name"),
          code: formData.get("code"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error);
      await load(payload.circleId);
      setShowOnboarding(false);
      setJoinCode(null);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your circle.");
    } finally {
      setBusy(null);
    }
  }

  function openCheckin() {
    if (data?.viewer.needsTerms) setShowTerms(true);
    else setShowCheckin(true);
  }

  async function acceptTerms() {
    if (!data) return;
    const response = await fetch("/api/account/terms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: data.termsVersion, ageConfirmed: true }),
    });
    const payload = (await response.json()) as ApiPayload;
    if (!response.ok) throw new Error(payload.error);
    setData({ ...data, viewer: { ...data.viewer, needsTerms: false } });
    setShowTerms(false);
    setShowCheckin(true);
  }

  async function generateMemory(automatic = false) {
    if (!data?.circle || !data.today) return;
    setBusy("generate");
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId: data.circle.id, day: data.today }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error);
      if (payload.pending) {
        window.setTimeout(() => load(data.circle!.id), 2500);
        return;
      }
      await load(data.circle.id);
      if (!automatic) setTab("memories");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tonight’s world needs another minute.");
    } finally {
      setBusy(null);
    }
  }

  async function saveCircleSettings(settings: {
    name: string;
    revealHour: number;
    timezone: string;
    style: string;
  }) {
    if (!data?.circle) return;
    setBusy("settings");
    setError(null);
    try {
      const response = await fetch("/api/circles/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId: data.circle.id, ...settings }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error);
      await load(data.circle.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save circle settings.");
    } finally {
      setBusy(null);
    }
  }

  async function react(memory: Memory, emoji: string) {
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memoryId: memory.id, emoji }),
    });
    if (data?.circle) await load(data.circle.id);
  }

  // Report, block, remove, leave, and delete all share this request shape.
  async function safetyRequest(path: string, method: string, body: unknown, success?: string) {
    setError(null);
    const response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "That didn’t work.");
    if (success) setNotice(success);
    await load(data?.circle?.id);
  }

  async function runSafety(action: () => Promise<void>) {
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn’t work.");
    }
  }

  async function makeMovie(memory: Memory) {
    setBusy("movie");
    setMovieProgress(1);
    setError(null);
    try {
      const movie = await renderMiniMovie(memory.mediaUrl, setMovieProgress);
      const extension = movie.type.startsWith("video/mp4") ? "mp4" : "webm";
      setMovieAsset({
        memoryId: memory.id,
        blob: movie,
        url: URL.createObjectURL(movie),
        fileName: `kinwhim-${memory.day}.${extension}`,
        mimeType: movie.type,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not make the mini movie.");
    } finally {
      setBusy(null);
      setMovieProgress(0);
    }
  }

  async function shareMovie(asset: MovieAsset) {
    const file = new File([asset.blob], asset.fileName, { type: asset.mimeType });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "A Kinwhim memory",
          text: "A little world made with my people.",
        });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    downloadMovie(asset);
  }

  function downloadMovie(asset: MovieAsset) {
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.fileName;
    link.click();
  }

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f1e8] text-[#222018]">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(#f4a261_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
      <header className="sticky top-0 z-30 border-b border-[#29251d]/10 bg-[#f6f1e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <button className="flex items-center gap-3" onClick={() => setTab("today")}>
            <BrandMark />
            <span className="font-serif text-2xl font-black tracking-[-0.04em]">kinwhim</span>
          </button>
          {data?.circle && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvite(true)}
                className="hidden rounded-full border border-[#29251d]/15 bg-white/60 px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 sm:block"
              >
                Invite a friend
              </button>
              <button
                onClick={() => setShowActivity(true)}
                className="relative grid h-10 w-10 place-items-center rounded-full border border-[#29251d]/15 bg-white/60"
                aria-label="Open Kinwhim activity"
              >
                <Bell size={18} />
                {data.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef8354] px-1 text-[10px] font-black text-[#242117]">
                    {data.unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab("circle")}
                className="grid h-10 w-10 place-items-center rounded-full bg-[#27231a] text-sm font-black text-[#fff8e8]"
                aria-label="Circle settings"
              >
                {initials(user.name)}
              </button>
            </div>
          )}
        </div>
      </header>

      {data?.circle ? (
        <div className="relative mx-auto max-w-6xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#b75d3e]">
                {friendlyDay(data.today)} · {data.circle.name}
              </p>
              <h1 className="max-w-2xl font-serif text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">
                {me?.checkedIn ? "You’re in. Let the day unfold." : "Show up exactly as you are."}
              </h1>
              <Streaks streaks={data.streaks} />
            </div>
            <CircleSwitcher
              circles={data.circles}
              selected={data.circle.id}
              onChange={(id) => load(id).catch((caught) => setError(caught.message))}
            />
          </div>

          {error && <ErrorToast message={error} onClose={() => setError(null)} />}
          {!error && notice && <ErrorToast tone="ok" message={notice} onClose={() => setNotice(null)} />}

          {tab === "today" && (
            <section className="grid gap-5 lg:grid-cols-[1.45fr_0.8fr]">
              <article className="relative overflow-hidden rounded-[32px] bg-[#242117] p-6 text-[#fff8e8] shadow-[0_30px_80px_rgba(55,38,18,.18)] sm:p-9">
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ef8354]/30 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#f6c985]">Today’s roll call</p>
                    <h2 className="mt-2 font-serif text-3xl font-black sm:text-4xl">
                      {checkedCount} of {data.members.length} friends are here
                    </h2>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#fff8e8]/20 text-lg font-black">
                    {Math.round((checkedCount / Math.max(data.members.length, 1)) * 100)}%
                  </div>
                </div>

                <div className="relative mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {data.members.map((member, index) => (
                    <MemberTile
                      key={member.id}
                      member={member}
                      index={index}
                      onMenu={member.id === data.viewer.id ? undefined : () => setMemberMenu(member)}
                    />
                  ))}
                  <button
                    onClick={() => setShowInvite(true)}
                    className="group grid aspect-[.82] place-items-center rounded-[22px] border border-dashed border-[#fff8e8]/25 bg-white/5"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff8e8]/10 transition group-hover:rotate-12 group-hover:scale-110">
                      <Plus size={19} />
                    </span>
                  </button>
                </div>

                <div className="relative mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                  <p className="flex items-center gap-2 text-sm text-[#fff8e8]/70">
                    <LockKeyhole size={15} /> Private to this circle · transforms at {revealLabel}
                  </p>
                  {!me?.checkedIn ? (
                    <button onClick={openCheckin} className="kw-primary kw-primary-light">
                      <Camera size={18} /> Take today’s selfie
                    </button>
                  ) : (
                    <button onClick={openCheckin} className="kw-secondary-dark">
                      <Check size={17} /> Checked in · retake
                    </button>
                  )}
                </div>
              </article>

              <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[28px] border border-[#29251d]/10 bg-[#ef8354] p-6 text-[#241f17] shadow-[0_20px_50px_rgba(148,76,44,.16)]">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff8e8]/45">
                      <WandSparkles size={22} />
                    </span>
                    <span className="rounded-full bg-[#fff8e8]/35 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                      Tonight
                    </span>
                  </div>
                  <h3 className="mt-6 font-serif text-3xl font-black leading-none">A tiny world is waiting.</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-[#241f17]/75">
                    Kinwhim blends everyone’s opted-in selfies into one playful friendship scene.
                  </p>
                  <button
                    onClick={() => void generateMemory()}
                    disabled={!allChecked || busy === "generate"}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#242117] px-5 py-3.5 text-sm font-black text-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {busy === "generate" ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {allChecked ? "Make tonight’s world" : `Waiting on ${data.members.length - checkedCount}`}
                  </button>
                </div>

                <div className="rounded-[28px] border border-[#29251d]/10 bg-[#c9d9c3] p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/45">
                      <ImageIcon size={19} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#3f5d42]">Memory shelf</p>
                      <p className="font-serif text-xl font-black">{data.memories.length} little worlds</p>
                    </div>
                  </div>
                  {newestMemory ? (
                    <button className="mt-5 flex w-full items-center gap-3 text-left" onClick={() => { setSelectedMemory(newestMemory); setTab("memories"); }}>
                      <PrivateImage src={newestMemory.mediaUrl} alt="Latest Kinwhim memory" className="h-16 w-16 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{newestMemory.title}</p>
                        <p className="mt-1 text-xs text-[#3f5d42]">Open the latest memory →</p>
                      </div>
                    </button>
                  ) : (
                    <p className="mt-5 text-sm leading-relaxed text-[#3f5d42]">Your first shared memory will live here after everyone checks in.</p>
                  )}
                </div>
              </aside>
            </section>
          )}

          {tab === "memories" && (
            <MemoryShelf
              circleId={data.circle.id}
              memories={data.memories}
              selected={selectedMemory}
              busy={busy}
              movieProgress={movieProgress}
              movieAsset={movieAsset}
              onSelect={setSelectedMemory}
              onReact={react}
              onMovie={makeMovie}
              onShareMovie={shareMovie}
              onDownloadMovie={downloadMovie}
              canDelete={(memory) => data.circle?.ownerId === data.viewer.id || memory.featuresViewer}
              onReport={(memory) =>
                setReportTarget({ targetType: "memory", targetId: memory.id, label: "this memory", canBlock: false })
              }
              onDelete={(memory) => {
                if (!window.confirm("Delete this memory for everyone in the circle? This can’t be undone.")) return;
                void runSafety(async () => {
                  await safetyRequest(`/api/memories/${encodeURIComponent(memory.id)}`, "DELETE", {}, "Memory deleted.");
                  setSelectedMemory(null);
                });
              }}
            />
          )}

          {tab === "circle" && (
            <CirclePanel
              circle={data.circle}
              members={data.members}
              viewerId={data.viewer.id}
              canEdit={data.circle.ownerId === data.viewer.id}
              saving={busy === "settings"}
              onInvite={() => setShowInvite(true)}
              onNewCircle={() => setShowOnboarding(true)}
              onSave={saveCircleSettings}
              onMemberMenu={setMemberMenu}
              onLeave={() => {
                const circle = data.circle!;
                const message =
                  circle.ownerId === data.viewer.id
                    ? "Leave this circle? Your selfies here are deleted and the next longest-standing member becomes keeper. If you’re the last one, the circle and its memories are deleted."
                    : "Leave this circle? Your selfies here are deleted. You’ll need a new invite to come back.";
                if (!window.confirm(message)) return;
                void runSafety(async () => {
                  await safetyRequest("/api/circles/members", "DELETE", { circleId: circle.id, userId: data.viewer.id }, `You left ${circle.name}.`);
                  setTab("today");
                });
              }}
            />
          )}
          {tab === "circle" && (
            <nav className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-[#6d675a]">
              <a href="/account" className="underline-offset-4 hover:underline">Account &amp; privacy</a>
              <a href="/privacy" className="underline-offset-4 hover:underline">Privacy Policy</a>
              <a href="/terms" className="underline-offset-4 hover:underline">Terms</a>
              <a href="/support" className="underline-offset-4 hover:underline">Help &amp; safety</a>
            </nav>
          )}
        </div>
      ) : (
        <EmptyHome name={firstName(user.name)} onStart={() => setShowOnboarding(true)} error={error} />
      )}

      {data?.circle && (
        <nav className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-white/40 bg-[#242117]/95 p-1.5 text-[#fff8e8] shadow-2xl backdrop-blur-xl">
          <NavButton active={tab === "today"} onClick={() => setTab("today")} icon={<Sparkles size={18} />} label="Today" />
          <NavButton active={tab === "memories"} onClick={() => setTab("memories")} icon={<ImageIcon size={18} />} label="Memories" />
          <NavButton active={tab === "circle"} onClick={() => setTab("circle")} icon={<Users size={18} />} label="Circle" />
        </nav>
      )}

      {showOnboarding && (
        <OnboardingModal
          busy={busy === "circle"}
          initialCode={joinCode}
          onSubmit={createOrJoin}
          onClose={data?.circle ? () => setShowOnboarding(false) : undefined}
        />
      )}
      {showCheckin && data?.circle && data.today && (
        <CheckinModal
          circle={data.circle}
          day={data.today}
          current={me}
          onClose={() => setShowCheckin(false)}
          onSaved={async () => {
            setShowCheckin(false);
            await load(data.circle!.id);
          }}
          onDeleted={async () => {
            setShowCheckin(false);
            await load(data.circle!.id);
          }}
          onError={setError}
        />
      )}
      {memberMenu && data?.circle && (
        <MemberMenuModal
          member={memberMenu}
          isKeeper={data.circle.ownerId === data.viewer.id}
          onClose={() => setMemberMenu(null)}
          onReport={(target) => {
            setMemberMenu(null);
            setReportTarget(target);
          }}
          onBlock={(block) => {
            const member = memberMenu;
            if (block && !window.confirm(`Block ${member.name}? You won’t see each other’s selfies or appear together in new memories. They aren’t notified.`)) return;
            setMemberMenu(null);
            void runSafety(() =>
              safetyRequest("/api/blocks", block ? "POST" : "DELETE", { userId: member.id }, block ? `${member.name} is blocked.` : `${member.name} is unblocked.`),
            );
          }}
          onRemove={() => {
            const member = memberMenu;
            if (!window.confirm(`Remove ${member.name} from the circle? Their selfies here are deleted and the invite code is reset.`)) return;
            setMemberMenu(null);
            void runSafety(() =>
              safetyRequest("/api/circles/members", "DELETE", { circleId: data.circle!.id, userId: member.id }, `${member.name} was removed. Share the new invite code with anyone still joining.`),
            );
          }}
        />
      )}
      {reportTarget && (
        <ReportModal
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={async (reason, details, block) => {
            await safetyRequest(
              "/api/reports",
              "POST",
              { targetType: reportTarget.targetType, targetId: reportTarget.targetId, reason, details, block },
              `Thanks for telling us. We review every report within 24 hours.${block ? " You’ve also blocked this person." : ""}`,
            );
            if (reportTarget.targetType === "memory") setSelectedMemory(null);
            setReportTarget(null);
          }}
        />
      )}
      {showTerms && (
        <TermsModal onClose={() => setShowTerms(false)} onAccept={acceptTerms} />
      )}
      {showInvite && data?.circle && (
        <InviteModal circle={data.circle} onClose={() => setShowInvite(false)} />
      )}
      {showActivity && data?.circle && (
        <ActivityModal
          memories={data.memories}
          onClose={() => setShowActivity(false)}
          onOpen={async (memory) => {
            await fetch("/api/notifications", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ memoryId: memory.id }),
            });
            setSelectedMemory(memory);
            setShowActivity(false);
            setTab("memories");
            await load(data.circle!.id);
          }}
        />
      )}
    </main>
  );
}

function BrandMark() {
  return (
    <span className="relative grid h-10 w-10 rotate-[-7deg] place-items-center rounded-[14px] bg-[#ef8354] text-[#242117] shadow-[3px_3px_0_#242117]">
      <Sparkles size={20} strokeWidth={2.5} />
    </span>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f1e8] text-[#242117]">
      <div className="text-center">
        <div className="mx-auto animate-bounce"><BrandMark /></div>
        <p className="mt-5 font-serif text-2xl font-black">Gathering the little things…</p>
      </div>
    </main>
  );
}

function EmptyHome({ name, onStart, error }: { name: string; onStart: () => void; error: string | null }) {
  return (
    <section className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl items-center px-5 py-16 sm:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b75d3e]">Hello, {name}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-6xl font-black leading-[.9] tracking-[-.055em] sm:text-8xl">
            One selfie. One shared little world.
          </h1>
          <p className="mt-7 max-w-xl text-lg font-medium leading-relaxed text-[#5b5548]">
            A low-pressure daily ritual for the people you never want to drift from. Show up once; Kinwhim turns the group into something delightfully unexpected.
          </p>
          {error && <p className="mt-4 font-bold text-[#b23b2a]">{error}</p>}
          <button onClick={onStart} className="kw-primary mt-8">
            <Sparkles size={19} /> Start a circle
          </button>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div className="absolute inset-[9%] rotate-6 rounded-[36px] bg-[#c9d9c3] shadow-[0_30px_80px_rgba(55,38,18,.16)]" />
          <div className="absolute inset-[5%_12%_13%_4%] -rotate-6 overflow-hidden rounded-[36px] bg-[#ef8354] p-7 shadow-[0_30px_80px_rgba(55,38,18,.2)]">
            <div className="grid h-full grid-cols-2 gap-3">
              {["🌈", "🪩", "🌷", "🚲"].map((emoji, index) => (
                <div key={emoji} className={`grid place-items-center rounded-[24px] text-6xl ${index % 2 ? "bg-[#f5d98b]" : "bg-[#fff8e8]"}`}>
                  <span className="transition hover:scale-125">{emoji}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="absolute right-0 top-[6%] rotate-12 rounded-full bg-[#f5d98b] px-5 py-3 font-black shadow-lg">same time tomorrow?</span>
        </div>
      </div>
    </section>
  );
}

function Streaks({ streaks }: { streaks: { circle: number; mine: number } }) {
  if (!streaks.circle && !streaks.mine) return null;
  const chip = "rounded-full border border-[#29251d]/12 bg-white/60 px-3.5 py-1.5 text-sm font-black";
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Streaks">
      {streaks.circle > 0 && (
        <span className={chip} title="Days in a row your circle made a memory">
          🔥 {streaks.circle}-day circle streak
        </span>
      )}
      {streaks.mine > 0 && (
        <span className={chip} title="Days in a row you checked in">
          ✨ You: {streaks.mine} {streaks.mine === 1 ? "day" : "days"}
        </span>
      )}
    </div>
  );
}

function MemberTile({ member, index, onMenu }: { member: Member; index: number; onMenu?: () => void }) {
  const colors = ["#ef8354", "#f5d98b", "#c9d9c3", "#c6b9dc", "#e7b4a2"];
  return (
    <div className="min-w-0">
      <div className="relative aspect-[.82] overflow-hidden rounded-[22px] bg-white/10">
        {member.photoUrl ? (
          <PrivateImage src={member.photoUrl} alt={`${member.name}'s selfie`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-2xl font-black text-[#242117]" style={{ background: colors[index % colors.length] }}>
            {member.blocked ? <Ban size={24} /> : initials(member.name)}
          </div>
        )}
        <span className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[11px] ${member.checkedIn ? "bg-[#d8f3dc] text-[#245a2d]" : "bg-[#242117]/70 text-white"}`}>
          {member.checkedIn ? <Check size={13} strokeWidth={3} /> : "…"}
        </span>
        {onMenu && (
          <button
            onClick={onMenu}
            aria-label={`Options for ${member.name}: report or block`}
            className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#242117]/70 text-white transition hover:bg-[#242117]"
          >
            <Ellipsis size={15} />
          </button>
        )}
      </div>
      <p className="mt-2 truncate text-center text-xs font-bold text-[#fff8e8]/75">{firstName(member.name)}</p>
    </div>
  );
}

function CircleSwitcher({ circles, selected, onChange }: { circles: Circle[]; selected: string; onChange: (id: string) => void }) {
  if (circles.length < 2) return null;
  return (
    <label className="relative">
      <select value={selected} onChange={(event) => onChange(event.target.value)} className="appearance-none rounded-full border border-[#29251d]/15 bg-white/55 py-2.5 pl-4 pr-10 text-sm font-black outline-none">
        {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3" size={16} />
    </label>
  );
}

function MemoryShelf({ circleId, memories, selected, busy, movieProgress, movieAsset, onSelect, onReact, onMovie, onShareMovie, onDownloadMovie, canDelete, onReport, onDelete }: {
  circleId: string;
  memories: Memory[];
  selected: Memory | null;
  busy: string | null;
  movieProgress: number;
  movieAsset: MovieAsset | null;
  onSelect: (memory: Memory | null) => void;
  onReact: (memory: Memory, emoji: string) => void;
  onMovie: (memory: Memory) => void;
  onShareMovie: (asset: MovieAsset) => void;
  onDownloadMovie: (asset: MovieAsset) => void;
  canDelete: (memory: Memory) => boolean;
  onReport: (memory: Memory) => void;
  onDelete: (memory: Memory) => void;
}) {
  const [view, setView] = useState<"shelf" | "calendar">("shelf");
  const featured = selected ?? memories[0];
  if (!featured) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-[32px] border border-dashed border-[#29251d]/20 bg-white/30 p-8 text-center">
        <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#c9d9c3]"><ImageIcon /></span><h2 className="mt-5 font-serif text-3xl font-black">Your shelf is waiting.</h2><p className="mt-2 text-[#5b5548]">The first little world appears after your circle completes a day.</p></div>
      </div>
    );
  }
  const featuredMovie = movieAsset?.memoryId === featured.id ? movieAsset : null;
  return (
    <section>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="group relative overflow-hidden rounded-[34px] bg-[#242117] p-3 shadow-[0_30px_80px_rgba(55,38,18,.22)]">
          <PrivateImage src={featured.mediaUrl} alt={featured.title} className="aspect-square w-full rounded-[25px] object-cover" />
          <div className="absolute inset-x-8 bottom-8 rounded-[22px] bg-[#242117]/88 p-5 text-[#fff8e8] backdrop-blur-md">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#f5d98b]">{prettyDate(featured.day)}</p>
            <h2 className="mt-1 font-serif text-3xl font-black">{featured.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {reactions.map((emoji) => (
                <button key={emoji} onClick={() => onReact(featured, emoji)} className="rounded-full bg-white/10 px-3 py-1.5 text-lg transition hover:-translate-y-1 hover:bg-white/20">
                  {emoji}{featured.reactions.filter((item) => item === emoji).length ? <span className="ml-1 text-xs">{featured.reactions.filter((item) => item === emoji).length}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-[28px] border border-[#29251d]/10 bg-[#f5d98b] p-6">
            <Clapperboard size={28} />
            <h3 className="mt-5 font-serif text-3xl font-black">Make it move</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#5b5548]">Turn this world into a six-second animated keepsake with a slow cinematic drift and a little confetti. On iPhone, share it straight to Photos or Messages.</p>
            <button onClick={() => onMovie(featured)} disabled={busy === "movie"} className="kw-primary mt-6 w-full justify-center disabled:opacity-60">
              {busy === "movie" ? <LoaderCircle className="animate-spin" size={18} /> : <Clapperboard size={18} />}
              {busy === "movie" ? `Rendering ${movieProgress}%` : featuredMovie ? "Remake mini movie" : "Make mini movie"}
            </button>
            {featuredMovie && (
              <div className="mt-5 rounded-[22px] bg-[#242117] p-3 text-[#fff8e8]">
                <video src={featuredMovie.url} controls playsInline className="aspect-square w-full rounded-[15px] object-cover" />
                <p className="mt-3 px-1 text-xs font-bold text-white/60">{featuredMovie.mimeType.startsWith("video/mp4") ? "iPhone-ready MP4" : "Web video"} · preview it, then save or share.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => onShareMovie(featuredMovie)} className="flex items-center justify-center gap-2 rounded-full bg-[#ef8354] px-3 py-2.5 text-sm font-black text-[#242117]"><Share2 size={16} /> Share / Save</button>
                  <button onClick={() => onDownloadMovie(featuredMovie)} className="flex items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-2.5 text-sm font-black"><Download size={16} /> Download</button>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-[28px] border border-[#29251d]/10 bg-white/45 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Memory promise</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-[#5b5548]">Only your circle can open these images. Original selfies stay private to the group and are deleted after 14 days.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => onReport(featured)} className="flex items-center gap-2 rounded-full border border-[#29251d]/15 px-4 py-2 text-sm font-bold">
                <Flag size={15} /> Report memory
              </button>
              {canDelete(featured) && (
                <button onClick={() => onDelete(featured)} className="flex items-center gap-2 rounded-full border border-[#b23b2a]/30 px-4 py-2 text-sm font-bold text-[#a53b2c]">
                  <Trash2 size={15} /> Delete for everyone
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
      <div className="mb-4 mt-12 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-3xl font-black">{view === "shelf" ? "The shelf" : "The calendar"}</h3>
        <div className="flex rounded-full border border-[#29251d]/15 bg-white/50 p-1" role="tablist">
          {(["shelf", "calendar"] as const).map((option) => (
            <button
              key={option}
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-black capitalize ${view === option ? "bg-[#242117] text-[#fff8e8]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {view === "shelf" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {memories.map((memory, index) => (
            <button key={memory.id} onClick={() => onSelect(memory)} className={`group text-left ${index % 2 ? "sm:translate-y-5" : ""}`}>
              <PrivateImage src={memory.mediaUrl} alt={memory.title} className="aspect-square w-full rounded-[24px] object-cover shadow-lg transition duration-300 group-hover:-translate-y-2 group-hover:rotate-1" />
              <p className="mt-3 truncate font-black">{memory.title}</p><p className="text-xs text-[#6d675a]">{prettyDate(memory.day)}</p>
            </button>
          ))}
        </div>
      ) : (
        <MemoryCalendar circleId={circleId} initialMonth={featured.day.slice(0, 7)} onSelect={(memory) => { onSelect(memory); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      )}
    </section>
  );
}

// One month at a time from /api/memories, so memories older than the
// dashboard's recent list are still reachable.
function MemoryCalendar({ circleId, initialMonth, onSelect }: { circleId: string; initialMonth: string; onSelect: (memory: Memory) => void }) {
  const [month, setMonth] = useState(initialMonth);
  const [loaded, setLoaded] = useState<{ month: string; memories: Memory[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/memories?circle=${encodeURIComponent(circleId)}&month=${month}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { memories?: Memory[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Couldn’t load this month.");
        setLoaded({ month, memories: payload.memories ?? [] });
        setError(null);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Couldn’t load this month."));
  }, [circleId, month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const byDay = new Map((loaded?.month === month ? loaded.memories : []).map((memory) => [memory.day, memory]));
  const shift = (amount: number) => {
    const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
    setMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const label = new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="rounded-[30px] border border-[#29251d]/10 bg-white/50 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-full bg-[#eae2d4] font-black">‹</button>
        <p className="font-serif text-2xl font-black">{label}</p>
        <button onClick={() => shift(1)} aria-label="Next month" className="grid h-10 w-10 place-items-center rounded-full bg-[#eae2d4] font-black">›</button>
      </div>
      {error && <p className="mt-4 font-bold text-[#b23b2a]">{error}</p>}
      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-xs font-black uppercase tracking-wider text-[#6d675a] sm:gap-2.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={index}>{day}</span>)}
        {Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = `${month}-${String(index + 1).padStart(2, "0")}`;
          const memory = byDay.get(day);
          return memory ? (
            <button key={day} onClick={() => onSelect(memory)} aria-label={`${memory.title}, ${prettyDate(day)}`} className="relative aspect-square overflow-hidden rounded-xl shadow transition hover:-translate-y-0.5">
              <PrivateImage src={memory.mediaUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-md bg-[#242117]/70 px-1 text-[10px] text-white">{index + 1}</span>
            </button>
          ) : (
            <span key={day} className="grid aspect-square place-items-center rounded-xl bg-[#f6f1e8] text-[#6d675a]/70">{index + 1}</span>
          );
        })}
      </div>
    </div>
  );
}

function CirclePanel({ circle, members, viewerId, canEdit, saving, onInvite, onNewCircle, onSave, onMemberMenu, onLeave }: {
  circle: Circle;
  members: Member[];
  viewerId: string;
  canEdit: boolean;
  saving: boolean;
  onInvite: () => void;
  onNewCircle: () => void;
  onSave: (settings: { name: string; revealHour: number; timezone: string; style: string }) => Promise<void>;
  onMemberMenu: (member: Member) => void;
  onLeave: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-[34px] bg-[#242117] p-7 text-[#fff8e8] sm:p-10">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#f5d98b]">Your circle</p><h2 className="mt-2 font-serif text-5xl font-black">{circle.name}</h2></div><Settings2 /></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ef8354] font-black text-[#242117]">{initials(member.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{member.name}{member.id === viewerId ? " (you)" : ""}</p>
                <p className="text-xs text-white/55">{member.role === "owner" ? "Circle keeper" : "Friend"}{member.blocked ? " · Blocked" : ""}</p>
              </div>
              {member.id !== viewerId && (
                <button onClick={() => onMemberMenu(member)} aria-label={`Options for ${member.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                  <Ellipsis size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={onInvite} className="kw-primary kw-primary-light mt-7"><Plus size={18} /> Invite with {circle.inviteCode}</button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-[26px] border border-[#29251d]/10 bg-white/45 p-6"><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Daily rhythm</p><h3 className="mt-3 font-serif text-2xl font-black">Reveal at {formatHour(circle.revealHour)}</h3><p className="mt-2 text-sm text-[#6d675a]">{circle.style} · {circle.timezone.replaceAll("_", " ")}</p></div>
        <button onClick={onNewCircle} className="rounded-[26px] border border-dashed border-[#29251d]/20 bg-white/25 p-6 text-left transition hover:bg-white/50"><Plus /><h3 className="mt-4 font-serif text-2xl font-black">Add another circle</h3><p className="mt-2 text-sm text-[#6d675a]">Family, college friends, cousins—each gets its own private world.</p></button>
      </div>
      <button onClick={onLeave} className="mt-5 flex items-center gap-2 rounded-full border border-[#b23b2a]/30 px-5 py-2.5 text-sm font-bold text-[#a53b2c]">
        <LogOut size={16} /> Leave this circle
      </button>
      {canEdit && (
        <form
          className="mt-5 rounded-[28px] border border-[#29251d]/10 bg-[#fff8e8]/70 p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void onSave({
              name: String(form.get("name")),
              revealHour: Number(form.get("revealHour")),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              style: String(form.get("style")),
            });
          }}
        >
          <div className="flex items-center gap-3"><Settings2 size={20} /><div><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Keeper controls</p><h3 className="font-serif text-2xl font-black">Shape the daily ritual</h3></div></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label className="kw-label">Circle name</label><input name="name" defaultValue={circle.name} maxLength={48} className="kw-input" /></div>
            <div><label className="kw-label">Automatic reveal</label><select name="revealHour" defaultValue={circle.revealHour} className="kw-input">{[18, 19, 20, 21, 22, 23].map((hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select></div>
          </div>
          <label className="kw-label mt-6">Memory style</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["whimsical", "🎈"], ["cinematic", "🎬"], ["storybook", "📖"], ["scrapbook", "✂️"]].map(([style, emoji]) => <label key={style} className="cursor-pointer"><input className="peer sr-only" type="radio" name="style" value={style} defaultChecked={circle.style === style} /><span className="block rounded-2xl border border-[#29251d]/12 bg-white/50 p-3 text-center text-sm font-black capitalize transition peer-checked:border-[#242117] peer-checked:bg-[#242117] peer-checked:text-white"><span className="block text-xl">{emoji}</span>{style}</span></label>)}</div>
          <button disabled={saving} className="kw-primary mt-6"><Save size={17} />{saving ? "Saving…" : "Save circle settings"}</button>
        </form>
      )}
    </section>
  );
}

function OnboardingModal({ busy, initialCode, onSubmit, onClose }: { busy: boolean; initialCode: string | null; onSubmit: (data: FormData) => void; onClose?: () => void }) {
  const [mode, setMode] = useState<"create" | "join">(initialCode ? "join" : "create");
  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b75d3e]">Your people are the point</p><h2 className="mt-2 font-serif text-4xl font-black">{mode === "create" ? "Name your circle." : "Find your people."}</h2></div>{onClose && <CloseButton onClick={onClose} />}</div>
      <div className="mt-6 grid grid-cols-2 rounded-full bg-[#eae2d4] p-1"><button onClick={() => setMode("create")} className={`rounded-full py-2.5 text-sm font-black ${mode === "create" ? "bg-white shadow-sm" : ""}`}>Create</button><button onClick={() => setMode("join")} className={`rounded-full py-2.5 text-sm font-black ${mode === "join" ? "bg-white shadow-sm" : ""}`}>Join</button></div>
      <form action={onSubmit} className="mt-6"><input type="hidden" name="action" value={mode} />{mode === "create" ? <><label className="kw-label">Circle name</label><input name="name" required autoFocus maxLength={48} placeholder="The Sunday People" className="kw-input" /><p className="mt-3 text-sm text-[#6d675a]">You’ll get a private invite link to share with friends.</p></> : <><label className="kw-label">Invite code</label><input name="code" required autoFocus maxLength={12} defaultValue={initialCode ?? ""} placeholder="MOON427" className="kw-input uppercase" /><p className="mt-3 text-sm text-[#6d675a]">Your invite link filled this in automatically.</p></>}<button disabled={busy} className="kw-primary mt-7 w-full justify-center">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}{mode === "create" ? "Create my circle" : "Join the circle"}</button></form>
    </Modal>
  );
}

function CheckinModal({ circle, day, current, onClose, onSaved, onDeleted, onError }: { circle: Circle; day: string; current?: Member; onClose: () => void; onSaved: () => Promise<void>; onDeleted: () => Promise<void>; onError: (error: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(current?.photoUrl ?? null);
  const [mood, setMood] = useState(current?.mood ?? "sparkly");
  const [caption, setCaption] = useState(current?.caption ?? "");
  const [consent, setConsent] = useState(current?.consentTransform ?? true);
  const [saving, setSaving] = useState(false);

  function choose(file?: File) {
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) { inputRef.current?.click(); return; }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("circleId", circle.id); form.set("day", day); form.set("photo", photo); form.set("mood", mood); form.set("caption", caption); form.set("consentTransform", String(consent));
      const response = await fetch("/api/checkins", { method: "POST", body: form });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error);
      await onSaved();
    } catch (caught) { onError(caught instanceof Error ? caught.message : "Could not save your selfie."); } finally { setSaving(false); }
  }
  async function remove() {
    if (!window.confirm("Remove today’s selfie from this circle?")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/checkins", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId: circle.id, day }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error);
      await onDeleted();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not remove your selfie.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b75d3e]">Today’s check-in</p><h2 className="mt-2 font-serif text-4xl font-black">No performance required.</h2></div><CloseButton onClick={onClose} /></div>
      <form onSubmit={submit} className="mt-7 grid gap-6 sm:grid-cols-[.9fr_1.1fr]">
        <button type="button" onClick={() => inputRef.current?.click()} className="group relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[#e7ded0]">
          {preview ? <PrivateImage src={preview} alt="Your selfie preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-8 text-center"><span><Camera className="mx-auto" size={36} /><strong className="mt-4 block">Open camera or choose a photo</strong><small className="mt-2 block text-[#6d675a]">Front-camera photos work beautifully.</small></span></div>}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#242117]/85 px-4 py-2 text-xs font-black text-white backdrop-blur">{preview ? "Choose another" : "Add selfie"}</span>
          <input ref={inputRef} hidden type="file" accept="image/*" capture="user" onChange={(event) => choose(event.target.files?.[0])} />
        </button>
        <div><label className="kw-label">Your weather today</label><div className="flex flex-wrap gap-2">{moods.map(([label, emoji]) => <button type="button" key={label} onClick={() => setMood(label)} className={`rounded-full border px-3 py-2 text-sm font-bold transition ${mood === label ? "border-[#242117] bg-[#242117] text-white" : "border-[#29251d]/15 bg-white/50"}`}>{emoji} {label}</button>)}</div><label className="kw-label mt-6">Tiny caption <span className="font-medium text-[#8a8274]">(optional)</span></label><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={120} placeholder="Today felt like…" className="kw-input min-h-24 resize-none" /><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#c9d9c3]/55 p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#242117]" /><span><strong className="block text-sm">Include me in tonight’s transformation</strong><small className="mt-1 block leading-relaxed text-[#536352]">Kinwhim may use this selfie to make the circle’s private shared image. You can replace or remove it before the reveal.</small></span></label><button disabled={saving} className="kw-primary mt-6 w-full justify-center">{saving ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}Save today’s selfie</button>{current?.checkedIn && <button type="button" disabled={saving} onClick={remove} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black text-[#a53b2c] transition hover:bg-[#a53b2c]/8"><Trash2 size={16} />Remove today’s selfie</button>}</div>
      </form>
    </Modal>
  );
}

function InviteModal({ circle, onClose }: { circle: Circle; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = circle.inviteUrl ?? `${typeof window === "undefined" ? "" : window.location.origin}/join/${circle.inviteCode}`;
  const inviteText = `Join my private Kinwhim circle “${circle.name}”. One selfie a day, one shared little world. ${inviteUrl}`;
  return <Modal onClose={onClose}><div className="flex justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Bring the crew</p><h2 className="mt-2 font-serif text-4xl font-black">Pass the secret knock.</h2></div><CloseButton onClick={onClose} /></div><div className="mt-7 rounded-[26px] bg-[#242117] p-7 text-center text-[#fff8e8]"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f5d98b]">Invite code</p><p className="mt-3 font-mono text-4xl font-black tracking-[.12em]">{circle.inviteCode}</p></div><button onClick={async () => { await navigator.clipboard.writeText(inviteText); setCopied(true); }} className="kw-primary mt-5 w-full justify-center">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Link copied—send it anywhere" : "Copy smart invite link"}</button><p className="mt-4 text-center text-xs leading-relaxed text-[#6d675a]">The link opens the Kinwhim app and fills in the code. Only people with this code can join.</p></Modal>;
}

function ActivityModal({ memories, onClose, onOpen }: {
  memories: Memory[];
  onClose: () => void;
  onOpen: (memory: Memory) => Promise<void>;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Your circle moved</p><h2 className="mt-2 font-serif text-4xl font-black">Fresh little worlds.</h2></div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="mt-6 space-y-3">
        {memories.length ? memories.slice(0, 8).map((memory) => (
          <button
            key={memory.id}
            onClick={() => void onOpen(memory)}
            className="flex w-full items-center gap-4 rounded-[22px] border border-[#29251d]/10 bg-white/50 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/80"
          >
            <PrivateImage src={memory.mediaUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            <span className="min-w-0 flex-1"><strong className="block truncate font-serif text-lg">{memory.title}</strong><small className="mt-1 block text-[#6d675a]">{prettyDate(memory.day)} · tap to open</small></span>
            {!memory.isRead && <span className="h-3 w-3 shrink-0 rounded-full bg-[#ef8354]" aria-label="Unread" />}
          </button>
        )) : (
          <div className="rounded-[22px] bg-[#eae2d4] p-6 text-center"><Bell className="mx-auto" /><p className="mt-3 font-black">Quiet for now.</p><p className="mt-1 text-sm text-[#6d675a]">New memories will appear here after reveal time.</p></div>
        )}
      </div>
    </Modal>
  );
}

function MemberMenuModal({ member, isKeeper, onClose, onReport, onBlock, onRemove }: {
  member: Member;
  isKeeper: boolean;
  onClose: () => void;
  onReport: (target: ReportTarget) => void;
  onBlock: (block: boolean) => void;
  onRemove: () => void;
}) {
  const item = "flex w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-3.5 text-left font-bold transition hover:bg-white";
  return (
    <Modal onClose={onClose}>
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">{member.role === "owner" ? "Circle keeper" : "Friend"}</p>
          <h2 className="mt-2 font-serif text-4xl font-black">{member.name}</h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="mt-6 space-y-2">
        {member.checkinId && (
          <button className={item} onClick={() => onReport({ targetType: "photo", targetId: member.checkinId!, label: `${firstName(member.name)}’s selfie`, canBlock: true })}>
            <Flag size={18} /> Report today’s selfie
          </button>
        )}
        <button className={item} onClick={() => onReport({ targetType: "user", targetId: member.id, label: member.name, canBlock: true })}>
          <Flag size={18} /> Report {firstName(member.name)}
        </button>
        <button className={item} onClick={() => onBlock(!member.blocked)}>
          <Ban size={18} /> {member.blocked ? `Unblock ${firstName(member.name)}` : `Block ${firstName(member.name)}`}
        </button>
        {isKeeper && (
          <button className={`${item} text-[#a53b2c]`} onClick={onRemove}>
            <UserMinus size={18} /> Remove from circle
          </button>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-[#6d675a]">
        Reports go to the Kinwhim safety team, not to {firstName(member.name)}. Blocking hides your selfies from each other and keeps you out of new memories together.
      </p>
    </Modal>
  );
}

function ReportModal({ target, onClose, onSubmit }: {
  target: ReportTarget;
  onClose: () => void;
  onSubmit: (reason: string, details: string, block: boolean) => Promise<void>;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(target.canBlock);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal onClose={onClose}>
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Report</p>
          <h2 className="mt-2 font-serif text-3xl font-black">What’s wrong with {target.label}?</h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="mt-5 grid gap-2" role="radiogroup">
        {reportReasons.map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={reason === value}
            onClick={() => setReason(value)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${reason === value ? "border-[#242117] bg-[#242117] text-white" : "border-[#29251d]/12 bg-white/60 hover:bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value.slice(0, 1000))}
        placeholder="Anything else we should know? (optional)"
        className="kw-input mt-4 min-h-24"
      />
      {target.canBlock && (
        <label className="mt-4 flex items-center gap-3 text-sm font-bold">
          <input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} className="h-4 w-4" /> Also block this person
        </label>
      )}
      {error && <p className="mt-4 font-bold text-[#b23b2a]">{error}</p>}
      <button
        disabled={!reason || sending}
        onClick={async () => {
          setSending(true);
          setError(null);
          try { await onSubmit(reason!, details, target.canBlock && block); } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t send the report."); } finally { setSending(false); }
        }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#b23b2a] px-5 py-3.5 text-sm font-black text-white disabled:opacity-45"
      >
        {sending ? <LoaderCircle className="animate-spin" size={18} /> : <Flag size={18} />} Send report
      </button>
    </Modal>
  );
}

function TermsModal({ onClose, onAccept }: { onClose: () => void; onAccept: () => Promise<void> }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal onClose={onClose}>
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Before your first selfie</p>
          <h2 className="mt-2 font-serif text-4xl font-black">A few promises.</h2>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[#5b5548]">
        <li>• Only share photos of yourself. No nudity, harassment, or anything you wouldn’t want your friends to see.</li>
        <li>• If you opt in, your selfie is sent to our AI image provider to make the nightly memory. Raw selfies are deleted after 14 days.</li>
        <li>• You can report or block anyone, leave any circle, and delete your selfies or account at any time.</li>
      </ul>
      <label className="mt-6 flex items-start gap-3 text-sm font-bold">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          I’m 13 or older and agree to the <a className="underline" href="/terms" target="_blank">Terms</a> and{" "}
          <a className="underline" href="/privacy" target="_blank">Privacy Policy</a>, including zero tolerance for objectionable content.
        </span>
      </label>
      {error && <p className="mt-4 font-bold text-[#b23b2a]">{error}</p>}
      <button
        disabled={!agreed || saving}
        onClick={async () => {
          setSaving(true);
          setError(null);
          try { await onAccept(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save."); } finally { setSaving(false); }
        }}
        className="kw-primary mt-6 w-full justify-center disabled:opacity-45"
      >
        {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />} Agree and continue
      </button>
    </Modal>
  );
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#242117]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><div className={`my-auto w-full rounded-[32px] bg-[#f6f1e8] p-6 shadow-2xl sm:p-8 ${wide ? "max-w-3xl" : "max-w-lg"}`}>{children}</div></div>;
}
function CloseButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8dfd1]" aria-label="Close"><X size={19} /></button>; }
function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${active ? "bg-[#fff8e8] text-[#242117]" : "text-white/65 hover:text-white"}`}>{icon}<span className={active ? "inline" : "hidden sm:inline"}>{label}</span></button>; }
function ErrorToast({ message, onClose, tone = "error" }: { message: string; onClose: () => void; tone?: "error" | "ok" }) { return <div role={tone === "error" ? "alert" : "status"} className={`fixed left-1/2 top-24 z-50 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl px-5 py-4 font-bold text-white shadow-2xl ${tone === "error" ? "bg-[#b23b2a]" : "bg-[#3f5d42]"}`}><span>{message}</span><button onClick={onClose}><X size={18} /></button></div>; }

async function renderMiniMovie(imageUrl: string, onProgress: (value: number) => void) {
  if (!("MediaRecorder" in window)) throw new Error("Mini movies need a modern browser.");
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const image = await decodeCanvasImage(blob);
  const canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not open the movie canvas.");
  const paint: CanvasRenderingContext2D = context;
  const stream = canvas.captureStream(30);
  const mimeType = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("This browser cannot make a mini movie yet.");
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });
  recorder.start();
  const duration = 6000;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    function frame(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const scale = 1.03 + progress * 0.09;
      const width = canvas.width * scale;
      const height = canvas.height * scale;
      paint.fillStyle = "#242117"; paint.fillRect(0, 0, canvas.width, canvas.height);
      paint.drawImage(image, (canvas.width - width) / 2 + Math.sin(progress * Math.PI) * 14, (canvas.height - height) / 2 - progress * 12, width, height);
      paint.fillStyle = "rgba(20,15,8,.16)"; paint.fillRect(0, 0, canvas.width, canvas.height);
      const colors = ["#ef8354", "#f5d98b", "#c9d9c3", "#fff8e8"];
      for (let i = 0; i < 22; i++) { const x = (i * 97 + progress * 310 * (i % 3 + 1)) % 780 - 30; const y = (i * 61 + progress * 920) % 780 - 30; paint.save(); paint.translate(x, y); paint.rotate(progress * 8 + i); paint.fillStyle = colors[i % colors.length]; paint.fillRect(-4, -9, 8, 18); paint.restore(); }
      paint.fillStyle = "rgba(255,248,232,.92)"; paint.font = "900 28px Georgia"; paint.fillText("kinwhim", 28, 680);
      onProgress(Math.max(1, Math.round(progress * 100)));
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
  recorder.stop();
  if (image instanceof ImageBitmap) image.close();
  stream.getTracks().forEach((track) => track.stop());
  return finished;
}

async function decodeCanvasImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function initials(name: string) { return name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "K"; }
function firstName(name: string) { return name.split(/[\s@]+/)[0] || "friend"; }
function friendlyDay(day?: string) { if (!day) return "Today"; return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
function prettyDate(day: string) { return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatHour(hour: number) { const value = new Date(); value.setHours(hour, 0, 0, 0); return value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function isPastReveal(circle: Circle) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: circle.timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour >= circle.revealHour;
}
