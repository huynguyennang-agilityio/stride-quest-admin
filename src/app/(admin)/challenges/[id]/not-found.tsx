import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A challenge that doesn't exist (`challenge_not_found`, or an id that can't be one).
export default function ChallengeNotFound() {
  return (
    <main className="flex flex-1 flex-col items-start gap-4 px-4 pt-8 pb-12 sm:px-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Challenge not found</h1>
      <p className="text-muted-foreground max-w-[460px] text-sm">
        There is no challenge at this address. It may have been deleted, or the link may be wrong.
      </p>
      <Link href="/challenges" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
        Back to the challenges
      </Link>
    </main>
  );
}
