"use client";

import {
  Camera,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Settings2,
  Save,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Circle = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  revealHour: number;
  timezone: string;
  style: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
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
};

type Dashboard = {
  viewer: { id: string; name: string; email: string };
  circles: Circle[];
  circle: Circle | null;
  today?: string;
  members: Member[];
  memories: Memory[];
};

const moods = [
  ["sparkly", "✨"],
  ["sleepy", "☁️"],
  ["chaotic", "🌀"],
  ["soft", "🌷"],
  ["victorious", "🏆"],
];
const reactions = ["✨", "😂", "🥹", "🫶", "🔥"];

export function KinwhimApp({ user }: { user: { name: string; email: string } }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"today" | "memories" | "circle">("today");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [movieProgress, setMovieProgress] = useState(0);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const automaticReveal = useRef<string | null>(null);

  const load = useCallback(async (circleId?: string) => {
    setError(null);
    const response = await fetch(`/api/dashboard${circleId ? `?circle=${circleId}` : ""}`, {
      cache: "no-store",
    });
    const payload = await response.json();
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
      const payload = await response.json();
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
      const payload = await response.json();
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
      const payload = await response.json();
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

  async function makeMovie(memory: Memory) {
    setBusy("movie");
    setMovieProgress(1);
    setError(null);
    try {
      const movie = await renderMiniMovie(memory.mediaUrl, setMovieProgress);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(movie);
      link.download = `kinwhim-${memory.day}.webm`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not make the mini movie.");
    } finally {
      setBusy(null);
      setMovieProgress(0);
    }
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
            </div>
            <CircleSwitcher
              circles={data.circles}
              selected={data.circle.id}
              onChange={(id) => load(id).catch((caught) => setError(caught.message))}
            />
          </div>

          {error && <ErrorToast message={error} onClose={() => setError(null)} />}

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
                    <MemberTile key={member.id} member={member} index={index} />
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
                    <button onClick={() => setShowCheckin(true)} className="kw-primary kw-primary-light">
                      <Camera size={18} /> Take today’s selfie
                    </button>
                  ) : (
                    <button onClick={() => setShowCheckin(true)} className="kw-secondary-dark">
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
                    onClick={generateMemory}
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
                      <img src={newestMemory.mediaUrl} alt="Latest Kinwhim memory" className="h-16 w-16 rounded-2xl object-cover" />
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
              memories={data.memories}
              selected={selectedMemory}
              busy={busy}
              movieProgress={movieProgress}
              onSelect={setSelectedMemory}
              onReact={react}
              onMovie={makeMovie}
            />
          )}

          {tab === "circle" && (
            <CirclePanel
              circle={data.circle}
              members={data.members}
              canEdit={data.circle.ownerId === data.viewer.id}
              saving={busy === "settings"}
              onInvite={() => setShowInvite(true)}
              onNewCircle={() => setShowOnboarding(true)}
              onSave={saveCircleSettings}
            />
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
      {showInvite && data?.circle && (
        <InviteModal circle={data.circle} onClose={() => setShowInvite(false)} />
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

function MemberTile({ member, index }: { member: Member; index: number }) {
  const colors = ["#ef8354", "#f5d98b", "#c9d9c3", "#c6b9dc", "#e7b4a2"];
  return (
    <div className="min-w-0">
      <div className="relative aspect-[.82] overflow-hidden rounded-[22px] bg-white/10">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={`${member.name}'s selfie`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-2xl font-black text-[#242117]" style={{ background: colors[index % colors.length] }}>
            {initials(member.name)}
          </div>
        )}
        <span className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[11px] ${member.checkedIn ? "bg-[#d8f3dc] text-[#245a2d]" : "bg-[#242117]/70 text-white"}`}>
          {member.checkedIn ? <Check size={13} strokeWidth={3} /> : "…"}
        </span>
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

function MemoryShelf({ memories, selected, busy, movieProgress, onSelect, onReact, onMovie }: {
  memories: Memory[];
  selected: Memory | null;
  busy: string | null;
  movieProgress: number;
  onSelect: (memory: Memory | null) => void;
  onReact: (memory: Memory, emoji: string) => void;
  onMovie: (memory: Memory) => void;
}) {
  const featured = selected ?? memories[0];
  if (!featured) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-[32px] border border-dashed border-[#29251d]/20 bg-white/30 p-8 text-center">
        <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#c9d9c3]"><ImageIcon /></span><h2 className="mt-5 font-serif text-3xl font-black">Your shelf is waiting.</h2><p className="mt-2 text-[#5b5548]">The first little world appears after your circle completes a day.</p></div>
      </div>
    );
  }
  return (
    <section>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="group relative overflow-hidden rounded-[34px] bg-[#242117] p-3 shadow-[0_30px_80px_rgba(55,38,18,.22)]">
          <img src={featured.mediaUrl} alt={featured.title} className="aspect-square w-full rounded-[25px] object-cover" />
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
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#5b5548]">Turn this world into a six-second animated keepsake with a slow cinematic drift and a little confetti.</p>
            <button onClick={() => onMovie(featured)} disabled={busy === "movie"} className="kw-primary mt-6 w-full justify-center disabled:opacity-60">
              {busy === "movie" ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}
              {busy === "movie" ? `Rendering ${movieProgress}%` : "Download mini movie"}
            </button>
          </div>
          <div className="rounded-[28px] border border-[#29251d]/10 bg-white/45 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Memory promise</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-[#5b5548]">Only your circle can open these images. Original selfies stay private to the group and can be replaced by their owner.</p>
          </div>
        </aside>
      </div>
      <h3 className="mb-4 mt-12 font-serif text-3xl font-black">The shelf</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {memories.map((memory, index) => (
          <button key={memory.id} onClick={() => onSelect(memory)} className={`group text-left ${index % 2 ? "sm:translate-y-5" : ""}`}>
            <img src={memory.mediaUrl} alt={memory.title} className="aspect-square w-full rounded-[24px] object-cover shadow-lg transition duration-300 group-hover:-translate-y-2 group-hover:rotate-1" />
            <p className="mt-3 truncate font-black">{memory.title}</p><p className="text-xs text-[#6d675a]">{prettyDate(memory.day)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function CirclePanel({ circle, members, canEdit, saving, onInvite, onNewCircle, onSave }: {
  circle: Circle;
  members: Member[];
  canEdit: boolean;
  saving: boolean;
  onInvite: () => void;
  onNewCircle: () => void;
  onSave: (settings: { name: string; revealHour: number; timezone: string; style: string }) => Promise<void>;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-[34px] bg-[#242117] p-7 text-[#fff8e8] sm:p-10">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#f5d98b]">Your circle</p><h2 className="mt-2 font-serif text-5xl font-black">{circle.name}</h2></div><Settings2 /></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#ef8354] font-black text-[#242117]">{initials(member.name)}</span><div className="min-w-0"><p className="truncate font-black">{member.name}</p><p className="text-xs text-white/55">{member.role === "owner" ? "Circle keeper" : "Friend"}</p></div></div>)}
        </div>
        <button onClick={onInvite} className="kw-primary kw-primary-light mt-7"><Plus size={18} /> Invite with {circle.inviteCode}</button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-[26px] border border-[#29251d]/10 bg-white/45 p-6"><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Daily rhythm</p><h3 className="mt-3 font-serif text-2xl font-black">Reveal at {formatHour(circle.revealHour)}</h3><p className="mt-2 text-sm text-[#6d675a]">{circle.style} · {circle.timezone.replaceAll("_", " ")}</p></div>
        <button onClick={onNewCircle} className="rounded-[26px] border border-dashed border-[#29251d]/20 bg-white/25 p-6 text-left transition hover:bg-white/50"><Plus /><h3 className="mt-4 font-serif text-2xl font-black">Add another circle</h3><p className="mt-2 text-sm text-[#6d675a]">Family, college friends, cousins—each gets its own private world.</p></button>
      </div>
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
      const payload = await response.json();
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
      const payload = await response.json();
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
          {preview ? <img src={preview} alt="Your selfie preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-8 text-center"><span><Camera className="mx-auto" size={36} /><strong className="mt-4 block">Open camera or choose a photo</strong><small className="mt-2 block text-[#6d675a]">Front-camera photos work beautifully.</small></span></div>}
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
  const inviteUrl = `${typeof window === "undefined" ? "" : window.location.origin}/?join=${circle.inviteCode}`;
  const inviteText = `Join my private Kinwhim circle “${circle.name}”. One selfie a day, one shared little world. ${inviteUrl}`;
  return <Modal onClose={onClose}><div className="flex justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Bring the crew</p><h2 className="mt-2 font-serif text-4xl font-black">Pass the secret knock.</h2></div><CloseButton onClick={onClose} /></div><div className="mt-7 rounded-[26px] bg-[#242117] p-7 text-center text-[#fff8e8]"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f5d98b]">Invite code</p><p className="mt-3 font-mono text-4xl font-black tracking-[.12em]">{circle.inviteCode}</p></div><button onClick={async () => { await navigator.clipboard.writeText(inviteText); setCopied(true); }} className="kw-primary mt-5 w-full justify-center">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Link copied—send it anywhere" : "Copy smart invite link"}</button><p className="mt-4 text-center text-xs leading-relaxed text-[#6d675a]">The link fills in the code automatically. Friends still need permission to open this private site.</p></Modal>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#242117]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><div className={`my-auto w-full rounded-[32px] bg-[#f6f1e8] p-6 shadow-2xl sm:p-8 ${wide ? "max-w-3xl" : "max-w-lg"}`}>{children}</div></div>;
}
function CloseButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8dfd1]" aria-label="Close"><X size={19} /></button>; }
function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${active ? "bg-[#fff8e8] text-[#242117]" : "text-white/65 hover:text-white"}`}>{icon}<span className={active ? "inline" : "hidden sm:inline"}>{label}</span></button>; }
function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) { return <div className="fixed left-1/2 top-24 z-50 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-[#b23b2a] px-5 py-4 font-bold text-white shadow-2xl"><span>{message}</span><button onClick={onClose}><X size={18} /></button></div>; }

async function renderMiniMovie(imageUrl: string, onProgress: (value: number) => void) {
  if (!("MediaRecorder" in window)) throw new Error("Mini movies need a modern browser.");
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const image = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = 720; canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not open the movie canvas.");
  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
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
      context.fillStyle = "#242117"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, (canvas.width - width) / 2 + Math.sin(progress * Math.PI) * 14, (canvas.height - height) / 2 - progress * 12, width, height);
      context.fillStyle = "rgba(20,15,8,.16)"; context.fillRect(0, 0, canvas.width, canvas.height);
      const colors = ["#ef8354", "#f5d98b", "#c9d9c3", "#fff8e8"];
      for (let i = 0; i < 22; i++) { const x = (i * 97 + progress * 310 * (i % 3 + 1)) % 780 - 30; const y = (i * 61 + progress * 920) % 780 - 30; context.save(); context.translate(x, y); context.rotate(progress * 8 + i); context.fillStyle = colors[i % colors.length]; context.fillRect(-4, -9, 8, 18); context.restore(); }
      context.fillStyle = "rgba(255,248,232,.92)"; context.font = "900 28px Georgia"; context.fillText("kinwhim", 28, 680);
      onProgress(Math.max(1, Math.round(progress * 100)));
      if (progress < 1) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
  recorder.stop(); image.close(); stream.getTracks().forEach((track) => track.stop());
  return finished;
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
