import { Sparkles } from "lucide-react";
import Link from "next/link";

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#242117]">
      <header className="border-b border-[#29251d]/10">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 rotate-[-7deg] place-items-center rounded-[12px] bg-[#ef8354] shadow-[3px_3px_0_#242117]">
              <Sparkles size={18} strokeWidth={2.5} />
            </span>
            <span className="font-serif text-xl font-black tracking-[-0.04em]">kinwhim</span>
          </Link>
          <nav className="flex gap-4 text-sm font-bold text-[#6d675a]">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/support">Support</a>
          </nav>
        </div>
      </header>
      <article className="kw-legal mx-auto max-w-3xl px-5 py-12">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#b75d3e]">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-5xl font-black leading-[.95] tracking-[-.04em]">{title}</h1>
        {updated && <p className="mt-4 text-sm text-[#6d675a]">Last updated {updated}</p>}
        <div className="mt-10">{children}</div>
      </article>
    </main>
  );
}
