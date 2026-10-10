"use client";

import { Ban, Bell, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountPanel({ name, email, blocked: initialBlocked, remindersEnabled: initialReminders }: { name: string; email: string; blocked: Array<{ id: string; name: string }>; remindersEnabled: boolean }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [reminders, setReminders] = useState(initialReminders);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function call(path: string, init: RequestInit, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch(path, { headers: { "content-type": "application/json" }, ...init });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Something went sideways.");
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Something went sideways.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white/60 p-6">
        <p className="text-xs font-black uppercase tracking-widest text-[#b75d3e]">Signed in as</p>
        <p className="mt-2 font-serif text-2xl font-black">{name}</p>
        <p className="text-sm text-[#6d675a]">{email || "Private email"}</p>
        <button
          className="mt-5 flex items-center gap-2 rounded-full border border-[#29251d]/15 px-4 py-2 text-sm font-bold"
          onClick={async () => {
            if (await call("/api/auth/logout", { method: "POST", body: "{}" }, "logout")) {
              router.replace("/");
              router.refresh();
            }
          }}
        >
          {busy === "logout" ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />} Sign out
        </button>
      </section>

      <section className="rounded-[28px] bg-white/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl font-black"><Bell size={20} /> Check-in reminders</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5b5548]">
              A nudge in the Kinwhim app two hours before reveal if you haven’t checked in, when you’re the last one, and a Sunday recap of the week.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={reminders}
            aria-label="Check-in reminders"
            disabled={busy === "reminders"}
            onClick={async () => {
              const next = !reminders;
              if (await call("/api/me", { method: "PATCH", body: JSON.stringify({ remindersEnabled: next }) }, "reminders")) setReminders(next);
            }}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${reminders ? "bg-[#ef8354]" : "bg-[#29251d]/20"}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${reminders ? "left-7" : "left-1"}`} />
          </button>
        </div>
      </section>

      <section className="rounded-[28px] bg-white/60 p-6">
        <h2 className="font-serif text-2xl font-black">Blocked people</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5b5548]">
          Blocked people can’t see your selfies, you can’t see theirs, and you won’t appear together in new memories.
        </p>
        {blocked.length ? (
          <ul className="mt-4 divide-y divide-[#29251d]/10">
            {blocked.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 font-bold"><Ban size={16} /> {person.name}</span>
                <button
                  className="rounded-full border border-[#29251d]/15 px-4 py-1.5 text-sm font-bold"
                  onClick={async () => {
                    if (await call("/api/blocks", { method: "DELETE", body: JSON.stringify({ userId: person.id }) }, `unblock-${person.id}`)) {
                      setBlocked((current) => current.filter((item) => item.id !== person.id));
                    }
                  }}
                >
                  {busy === `unblock-${person.id}` ? "…" : "Unblock"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm font-bold text-[#6d675a]">You haven’t blocked anyone.</p>
        )}
      </section>

      <section className="rounded-[28px] bg-white/60 p-6">
        <h2 className="font-serif text-2xl font-black">Delete my selfies</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5b5548]">
          Removes every raw selfie you’ve uploaded to every circle. Memories that were already made stay
          unless you delete them or your account.
        </p>
        <button
          className="mt-4 flex items-center gap-2 rounded-full bg-[#242117] px-4 py-2.5 text-sm font-bold text-[#fff8e8]"
          onClick={async () => {
            if (!window.confirm("Delete all of your selfies? This can’t be undone.")) return;
            if (await call("/api/account/selfies", { method: "DELETE" }, "selfies")) setMessage("Your selfies were deleted.");
          }}
        >
          {busy === "selfies" ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete all selfies
        </button>
      </section>

      <section className="rounded-[28px] border-2 border-[#b23b2a]/30 bg-white/60 p-6">
        <h2 className="font-serif text-2xl font-black text-[#a53b2c]">Delete my account</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5b5548]">
          Permanently deletes your profile, sign-in methods, selfies, reactions, and every memory you appear in.
          Circles you keep pass to the next member; empty circles are deleted. This can’t be undone.
        </p>
        <label className="mt-4 block text-sm font-bold">
          Type DELETE to confirm
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#29251d]/15 bg-white px-4 py-3"
          />
        </label>
        <button
          disabled={confirmText !== "DELETE" || busy === "delete"}
          className="mt-4 flex items-center gap-2 rounded-full bg-[#b23b2a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          onClick={async () => {
            if (await call("/api/account", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) }, "delete")) {
              router.replace("/delete-account?done=1");
              router.refresh();
            }
          }}
        >
          {busy === "delete" ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete my account
        </button>
      </section>
      {message && <p className="text-center font-bold text-[#3f5d42]">{message}</p>}
    </div>
  );
}
