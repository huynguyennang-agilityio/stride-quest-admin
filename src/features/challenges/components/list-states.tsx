import { Flag } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { listHref, type ChallengeListParams } from "../schema";

export function NewChallengeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/challenges/new"
      className={cn(buttonVariants({ size: "lg" }), "h-10 font-semibold", className)}
    >
      New challenge
    </Link>
  );
}

export function EmptyState({ params }: { params: ChallengeListParams }) {
  const filtered = Boolean(params.q || params.type);
  const draft = params.status === "draft";

  return (
    <div className="bg-card flex flex-col items-center gap-3 rounded-[10px] border border-dashed px-6 py-14 text-center">
      <Flag className="text-muted-foreground size-10" strokeWidth={1.6} aria-hidden="true" />
      <h2 className="text-lg font-semibold">
        {filtered ? "No challenges match" : draft ? "No drafts" : "Nothing published yet"}
      </h2>
      <p className="text-muted-foreground max-w-[420px] text-sm">
        {filtered
          ? "Try a different search or type."
          : draft
            ? "A new challenge starts here as a draft until you publish it."
            : "Publish a draft and it shows up here and in the app."}
      </p>
      {filtered ? (
        <Link
          href={listHref({ status: params.status, q: "" })}
          className={cn(buttonVariants({ variant: "outline" }), "mt-1 h-10")}
        >
          Clear filters
        </Link>
      ) : (
        <NewChallengeLink className="mt-1" />
      )}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading challenges"
      role="status"
      className="bg-card flex flex-col rounded-[10px] border"
    >
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex items-center gap-4 border-t p-4 first:border-t-0">
          <div className="bg-muted h-[38px] w-14 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="bg-muted h-3 w-2/5 rounded" />
            <div className="bg-muted/70 h-2.5 w-1/4 rounded" />
          </div>
          <div className="bg-muted h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}
