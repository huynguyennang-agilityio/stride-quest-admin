"use client";

import { CircleAlert, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { listWords } from "../detail";
import { deleteChallenge, publishChallenge, unpublishChallenge } from "../status-actions";

type Props = {
  id: number;
  title: string;
  status: "draft" | "published";
  typeLabel: string;
  questTitle: string;
  /** What publishing still needs (from the challenge's own fields). */
  missing: string[];
};

type Failure = { code: string; message: string };

const OUTLINE = "h-10 font-medium";

/** The title, status and actions of a challenge, with the banner and the confirm dialogs. */
export function ChallengeHeader({ id, title, status, typeLabel, questTitle, missing }: Props) {
  const draft = status === "draft";
  const [dialog, setDialog] = useState<"delete" | "unpublish" | null>(null);
  const [banner, setBanner] = useState<Failure | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idParam = String(id);

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
  }

  function publish() {
    setBanner(null);
    startTransition(async () => {
      const result = await publishChallenge(idParam);
      if (!result.ok) setBanner(result.error);
    });
  }

  function confirm() {
    setDialogError(null);
    startTransition(async () => {
      const result =
        dialog === "delete" ? await deleteChallenge(idParam) : await unpublishChallenge(idParam);
      // A delete that works goes back to the list, so only a failure comes back here.
      if (!result.ok) return setDialogError(result.error.message);
      closeDialog();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-semibold tracking-[-0.01em] break-words">{title}</h1>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                draft
                  ? "bg-secondary text-muted-foreground border-input border"
                  : "bg-[#e3f2e2] text-[#1f5f24] dark:bg-[#1c3320] dark:text-[#9fdca4]",
              )}
            >
              {draft ? "Draft" : "Published"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {typeLabel} · {questTitle} quest · ID <span className="font-mono">{id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                OUTLINE,
                "border-destructive/40 text-destructive hover:text-destructive",
              )}
              onClick={() => setDialog("delete")}
            >
              Delete
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={OUTLINE}
              onClick={() => setDialog("unpublish")}
            >
              Unpublish
            </Button>
          )}
          <Link
            href={`/challenges/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), OUTLINE)}
          >
            Edit
          </Link>
          {draft ? (
            <Button
              type="button"
              className="h-10 font-semibold"
              disabled={pending && dialog === null}
              onClick={publish}
            >
              {pending && dialog === null ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {pending && dialog === null ? "Publishing…" : "Publish"}
            </Button>
          ) : null}
        </div>
      </div>

      {banner ? <FailureBanner failure={banner} missing={missing} /> : null}

      <Dialog open={dialog !== null} onOpenChange={(open) => (open ? null : closeDialog())}>
        <DialogContent>
          <div className="flex flex-col gap-2">
            <DialogTitle>
              {dialog === "delete" ? `Delete “${title}”?` : `Move “${title}” back to drafts?`}
            </DialogTitle>
            <DialogDescription>
              {dialog === "delete"
                ? "This draft and its medals are removed for good. You can’t undo this."
                : "Runners can no longer see or join it until you publish it again."}
            </DialogDescription>
          </div>
          {dialogError ? (
            <div
              role="alert"
              className="border-alert-error-border bg-alert-error text-alert-error-foreground flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm"
            >
              <CircleAlert className="mt-px size-[18px] flex-none" aria-hidden="true" />
              <span>{dialogError}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" className={OUTLINE} onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={dialog === "delete" ? "destructive" : "default"}
              className="h-10 font-semibold"
              disabled={pending}
              aria-busy={pending}
              onClick={confirm}
            >
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {dialog === "delete" ? "Delete draft" : "Unpublish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FailureBanner({ failure, missing }: { failure: Failure; missing: string[] }) {
  if (failure.code === "challenge_not_publishable") {
    return (
      <div
        role="alert"
        className="border-alert-warning-border bg-alert-warning text-alert-warning-foreground flex gap-3 rounded-[10px] border px-4 py-3.5 text-sm leading-normal"
      >
        <TriangleAlert className="mt-px size-5 flex-none" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <strong>This draft can’t be published yet.</strong>
          <span>
            {missing.length > 0 ? `Add ${listWords(missing)}, then publish again. ` : ""}
            Runners only see challenges with a cover, a description, at least one medal and an end
            date in the future.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="border-alert-error-border bg-alert-error text-alert-error-foreground flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
    >
      <CircleAlert className="mt-px size-[18px] flex-none" aria-hidden="true" />
      <span>{failure.message}</span>
    </div>
  );
}
