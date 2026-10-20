"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [{ href: "/challenges", label: "Challenges", icon: Flag }];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex gap-1 md:flex-col">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
              current
                ? "bg-[#263020] text-[#bef264]"
                : "text-[#d5ddcb] hover:bg-[#1d2418] hover:text-white",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
