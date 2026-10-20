import { ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MarkdownPreview } from "@/components/markdown-preview";

import type { DetailView } from "../detail";
import { ChallengeHeader } from "./challenge-header";
import { LocalDateTime } from "./local-date-time";
import { MedalTimeline } from "./medal-timeline";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border px-6 py-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Text({ source, empty }: { source: string; empty: string }) {
  return source.trim() === "" ? (
    <p className="text-muted-foreground text-sm">{empty}</p>
  ) : (
    <div className="max-w-[68ch]">
      <MarkdownPreview source={source} />
    </div>
  );
}

/** A challenge's page (design canvas, "Challenge detail"): header and actions, cover, texts, details and medals. */
export function ChallengeDetail({ challenge }: { challenge: DetailView }) {
  const facts: [string, React.ReactNode][] = [
    ["Type", challenge.typeLabel],
    ["Target", challenge.target],
    ["Starts", <LocalDateTime key="s" iso={challenge.startsAt} />],
    ["Ends", <LocalDateTime key="e" iso={challenge.endsAt} />],
    ["City", challenge.city ?? "—"],
    ["Landmark", challenge.landmark ?? "—"],
    ["Quest", challenge.questTitle],
    ["Participants", challenge.participants],
  ];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-7 pb-12 sm:px-10">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center gap-2 text-[13px]"
      >
        <Link href="/challenges" className="hover:text-foreground hover:underline">
          Challenges
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground truncate">
          {challenge.title}
        </span>
      </nav>

      <ChallengeHeader
        id={challenge.id}
        title={challenge.title}
        status={challenge.status}
        typeLabel={challenge.typeLabel}
        questTitle={challenge.questTitle}
        missing={challenge.missingForPublish}
      />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
          {challenge.coverImageUrl ? (
            <div className="relative aspect-video max-w-full overflow-hidden rounded-xl border">
              <Image
                src={challenge.coverImageUrl}
                alt={`Cover image of ${challenge.title}`}
                fill
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video max-w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d9b46a] bg-[#fffaf0] p-6 text-center text-[#6e4300] dark:border-[#6b4d14] dark:bg-[#2a2010] dark:text-[#f0d49c]">
              <ImageIcon className="size-8" strokeWidth={1.6} aria-hidden="true" />
              <strong className="text-[15px]">No cover image</strong>
              <span className="text-[13px]">Publishing needs one. Add it in Edit.</span>
            </div>
          )}
          <Card title="About">
            <Text
              source={challenge.descriptionMd}
              empty="No description yet. Publishing needs one."
            />
          </Card>
          <Card title="Terms">
            <Text source={challenge.termsMd} empty="No terms." />
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <Card title="Details">
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-4 gap-y-2.5 text-sm">
              {facts.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Medals">
            <MedalTimeline medals={challenge.medals} />
          </Card>
        </div>
      </div>
    </main>
  );
}
