import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCQ Quiz Generator",
  description: "PDF to MCQ quiz application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-brand-700">
              MCQ Quiz
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-brand-600">
              Dashboard
            </Link>
            <Link href="/upload" className="text-sm text-slate-600 hover:text-brand-600">
              Upload Images
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
