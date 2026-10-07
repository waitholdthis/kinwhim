import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinwhim — One selfie. One shared little world.",
  description:
    "A private daily ritual that turns your circle's selfies into playful shared memories.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/kinwhim-mark.svg",
    shortcut: "/kinwhim-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
