"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

import { Button } from "@/components/ui/button";

// A failed read of the list (the server didn't answer, or answered with an error). The
// message is the same for people whatever the cause; the cause is in the server log.
export default function ChallengesError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Challenges</h1>
      <div
        role="alert"
        className="border-alert-error-border bg-alert-error text-alert-error-foreground flex flex-wrap items-center justify-between gap-4 rounded-[10px] border p-6"
      >
        <div className="flex flex-col gap-1">
          <strong className="text-[15px]">Couldn&apos;t load challenges.</strong>
          <span className="text-sm">The server didn&apos;t answer. Try again in a moment.</span>
        </div>
        <Button variant="outline" onClick={retry} className="bg-card h-10 font-semibold">
          Try again
        </Button>
      </div>
    </main>
  );
}
