import { BrandLogo } from "@/features/auth/components/brand-logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getCurrentAdmin } from "@/features/auth/queries";

// The header with the signed-in admin and Sign out. Issue #5 replaces it with the sidebar.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand text-brand-foreground flex items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <span className="text-sm font-semibold">StrideQuest Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>{admin.display_name}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
