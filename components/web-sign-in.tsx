"use client";

import { LoaderCircle, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { type WebProviderConfig, WebProviders } from "@/components/web-providers";

export function WebSignIn({ providers }: { providers: WebProviderConfig }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Something went sideways.");
    return payload;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!sent) {
        await post("/api/auth/email/start", { email });
        setSent(true);
      } else {
        await post("/api/auth/email/verify", { email, code, platform: "web" });
        window.location.reload();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went sideways.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f1e8] px-5 py-16 text-[#242117]">
      <form onSubmit={submit} className="w-full max-w-md">
        <span className="grid h-14 w-14 rotate-[-7deg] place-items-center rounded-[18px] bg-[#ef8354] shadow-[3px_3px_0_#242117]">
          <Sparkles size={24} strokeWidth={2.5} />
        </span>
        <h1 className="mt-8 font-serif text-5xl font-black leading-[.95] tracking-[-.04em]">
          One selfie. One shared little world.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5b5548]">
          A private daily ritual for the people you never want to drift from.
        </p>
        <WebProviders
          config={providers}
          onError={setError}
          onToken={async (path, body) => {
            setError(null);
            try {
              await post(path, body);
              window.location.reload();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Sign-in didn’t finish.");
            }
          }}
        />
        <label className="mt-8 block text-xs font-black uppercase tracking-widest text-[#b75d3e]">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            disabled={sent}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#29251d]/15 bg-white/70 px-4 py-3.5 text-base font-medium normal-case tracking-normal text-[#242117]"
          />
        </label>
        {sent && (
          <label className="mt-4 block text-xs font-black uppercase tracking-widest text-[#b75d3e]">
            6-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              className="mt-2 w-full rounded-2xl border border-[#29251d]/15 bg-white/70 px-4 py-3.5 font-mono text-2xl font-black tracking-[.3em] text-[#242117]"
            />
          </label>
        )}
        {error && <p className="mt-4 font-bold text-[#b23b2a]">{error}</p>}
        <button disabled={busy} className="kw-primary mt-6 w-full justify-center">
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Mail size={18} />}
          {sent ? "Sign in" : "Email me a code"}
        </button>
        {sent && (
          <button type="button" onClick={() => { setSent(false); setCode(""); }} className="mt-3 w-full text-sm font-bold text-[#6d675a]">
            Use a different email
          </button>
        )}
        <p className="mt-8 text-center text-xs leading-relaxed text-[#6d675a]">
          By continuing you agree to the <a className="underline" href="/terms">Terms</a> and{" "}
          <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>
      </form>
    </main>
  );
}
