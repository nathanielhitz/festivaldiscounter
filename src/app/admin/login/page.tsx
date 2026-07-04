import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Admin login",
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="display text-2xl">Admin</h1>
      <LoginForm />
    </main>
  );
}
