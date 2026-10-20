import { BrandLogo } from "./brand-logo";

/** The dark side of the sign-in page (design canvas, "Sign in"). Hidden on phones. */
export function BrandPanel() {
  return (
    <section className="bg-brand text-brand-foreground hidden flex-[1_1_420px] flex-col justify-between gap-12 p-12 md:flex">
      <div className="flex items-center gap-3">
        <BrandLogo />
        <div className="flex flex-col">
          <span className="text-base font-semibold">StrideQuest</span>
          <span className="font-mono text-xs tracking-[0.06em] text-[#a9b3a0]">ADMIN</span>
        </div>
      </div>
      <div className="flex max-w-[440px] flex-col gap-4">
        <h2 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.02em]">
          Create, publish and manage challenges.
        </h2>
        <p className="text-base leading-relaxed text-[#b9c2b0]">
          Runners see a challenge in the app only after you publish it. Drafts stay here until they
          have a cover, a description and at least one medal.
        </p>
      </div>
      <svg viewBox="0 0 400 120" className="h-auto w-full max-w-[440px]" aria-hidden="true">
        <path
          d="M8 100 C 70 100, 80 40, 140 46 S 220 104, 270 70 S 340 20, 392 24"
          stroke="#3a4433"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M8 100 C 70 100, 80 40, 140 46 S 220 104, 230 92"
          stroke="#bef264"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="140" cy="46" r="7" fill="#151a12" stroke="#c98a4b" strokeWidth="3" />
        <circle cx="270" cy="70" r="7" fill="#151a12" stroke="#9aa3ad" strokeWidth="3" />
        <circle cx="392" cy="24" r="7" fill="#151a12" stroke="#e2b93b" strokeWidth="3" />
      </svg>
    </section>
  );
}
