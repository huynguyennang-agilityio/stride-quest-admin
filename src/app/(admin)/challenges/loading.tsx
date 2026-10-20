import { ListSkeleton } from "@/features/challenges/components/list-states";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Challenges</h1>
        <p className="text-muted-foreground text-sm">Loading challenges…</p>
      </div>
      <ListSkeleton />
    </main>
  );
}
