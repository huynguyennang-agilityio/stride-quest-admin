import { BrandLogo } from "@/features/auth/components/brand-logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

import { SidebarNav } from "./sidebar-nav";

type Props = {
  admin: { display_name: string; email: string };
  children: React.ReactNode;
};

/** The sidebar of the admin (design canvas, "Challenge list") around every page. */
export function AdminShell({ admin, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-brand text-brand-foreground flex flex-col gap-3 px-4 py-3 md:w-[232px] md:flex-none md:gap-7 md:py-5">
        <div className="flex items-center justify-between gap-3 md:px-2">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <span className="text-[15px] font-semibold">
              StrideQuest{" "}
              <span className="font-mono text-[11px] tracking-[0.06em] text-[#a9b3a0]">ADMIN</span>
            </span>
          </div>
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <SidebarNav />
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-col gap-2.5 border-t border-[#2b3326] px-2.5 py-3 md:flex">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{admin.display_name}</span>
            <span className="truncate text-xs text-[#a9b3a0]">{admin.email}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
