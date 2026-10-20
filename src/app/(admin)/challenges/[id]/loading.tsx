export default function Loading() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-7 pb-12 sm:px-10">
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading challenge"
        className="flex flex-col gap-6"
      >
        <div className="bg-muted h-4 w-48 rounded" />
        <div className="flex flex-col gap-3">
          <div className="bg-muted h-8 w-80 max-w-full rounded" />
          <div className="bg-muted/70 h-4 w-64 max-w-full rounded" />
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="bg-muted aspect-video min-w-0 flex-[999_1_420px] rounded-xl" />
          <div className="bg-muted h-64 flex-[1_1_320px] rounded-xl" />
        </div>
      </div>
    </main>
  );
}
