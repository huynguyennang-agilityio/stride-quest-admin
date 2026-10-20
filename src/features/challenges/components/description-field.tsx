"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { ChallengeFormValues } from "../form";
import { controlProps, Field, useFieldError } from "./form-parts";

const TABS = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
] as const;

/** The description: a Markdown textarea with a preview that shows it as the app does, without HTML. */
export function DescriptionField() {
  const { register, watch } = useFormContext<ChallengeFormValues>();
  const [view, setView] = useState<"write" | "preview">("write");
  const error = useFieldError("description");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="description" className="text-sm leading-none font-medium">
          About this challenge
        </label>
        <div
          role="tablist"
          aria-label="Description view"
          className="bg-muted flex gap-0.5 rounded-lg p-0.5"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`description-tab-${id}`}
              aria-selected={view === id}
              aria-controls="description-panel"
              onClick={() => setView(id)}
              className={cn(
                "h-[30px] rounded-md px-3 text-[13px]",
                view === id
                  ? "bg-card font-semibold shadow-xs"
                  : "text-muted-foreground font-medium",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="description-panel" role="tabpanel" aria-labelledby={`description-tab-${view}`}>
        {view === "write" ? (
          <Field
            id="description"
            label={null}
            error={error}
            hint="Markdown. Shown in the app as text, without HTML. Up to 20,000 characters. Needed to publish."
          >
            <Textarea
              rows={5}
              maxLength={20000}
              {...controlProps("description", error, true)}
              {...register("description")}
            />
          </Field>
        ) : (
          <div className="bg-card min-h-[132px] rounded-lg border p-3.5">
            <MarkdownPreview source={watch("description")} />
          </div>
        )}
      </div>
    </div>
  );
}
