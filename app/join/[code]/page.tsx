import { env } from "cloudflare:workers";
import type { Metadata } from "next";
import { normalizeInviteCode } from "@/lib/invites";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You’re invited to a Kinwhim circle",
  description: "One selfie a day, one shared little world. Join your friends on Kinwhim.",
  robots: { index: false },
};

// Opened when the app isn't installed (with it installed, iOS and Android hand
// this URL straight to the app). Shows store links and a web fallback.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeInviteCode((await params).code) ?? "";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f1e8] px-5 py-16 text-[#242117]">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 rotate-[-7deg] place-items-center rounded-[20px] bg-[#ef8354] text-3xl shadow-[4px_4px_0_#242117]">
          ✦
        </span>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-[#b75d3e]">You’re invited</p>
        <h1 className="mt-3 font-serif text-5xl font-black leading-[.95] tracking-[-.04em]">
          A friend saved you a spot.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[#5b5548]">
          Kinwhim circles are private and invitation-only. Get the app, sign in, and this code
          joins you to the circle.
        </p>
        <div className="mt-8 rounded-[26px] bg-[#242117] p-6 text-[#fff8e8]">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#f5d98b]">Invite code</p>
          <p className="mt-2 font-mono text-3xl font-black tracking-[.12em]">{code || "—"}</p>
        </div>
        <div className="mt-6 grid gap-3">
          {env.APP_STORE_URL && (
            <a href={env.APP_STORE_URL} className="kw-primary justify-center">Get Kinwhim for iPhone</a>
          )}
          {env.PLAY_STORE_URL && (
            <a href={env.PLAY_STORE_URL} className="kw-primary justify-center">Get Kinwhim for Android</a>
          )}
          <a
            href={`/?join=${encodeURIComponent(code)}`}
            className="rounded-full border border-[#29251d]/15 bg-white/60 px-5 py-3 text-sm font-bold"
          >
            Continue on the web
          </a>
        </div>
      </div>
    </main>
  );
}
