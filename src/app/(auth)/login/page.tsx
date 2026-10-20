import type { Metadata } from "next";

import { BrandPanel } from "@/features/auth/components/brand-panel";
import { BrandLogo } from "@/features/auth/components/brand-logo";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in · StrideQuest Admin" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-wrap">
      <BrandPanel />
      <div className="flex flex-[999_1_480px] flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="flex items-center gap-2.5 md:hidden">
          <BrandLogo size={32} />
          <span className="font-semibold">StrideQuest Admin</span>
        </div>
        {/* The action checks `next` again; only a relative path inside the app is followed. */}
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
