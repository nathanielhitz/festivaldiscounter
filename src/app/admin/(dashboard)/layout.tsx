import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { logoutAction } from "@/lib/admin/auth-actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-line pb-4">
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/admin" className="hover:text-accent">Dashboard</Link>
          <Link href="/admin/festivals" className="hover:text-accent">Festivals</Link>
          <Link href="/admin/review" className="hover:text-accent">Review-wachtrij</Link>
        </nav>
        <form action={logoutAction}>
          <button className="text-sm text-mut hover:text-accent">Uitloggen</button>
        </form>
      </header>
      {children}
    </div>
  );
}
