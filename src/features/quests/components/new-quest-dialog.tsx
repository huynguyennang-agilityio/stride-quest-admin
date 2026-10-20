"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createQuest } from "../actions";
import type { Quest } from "../queries";

type Values = { title: string; description: string };

/** "New quest": creates a quest and hands it back so the form can select it. */
export function NewQuestDialog({ onCreated }: { onCreated: (quest: Quest) => void }) {
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({ defaultValues: { title: "", description: "" } });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setBanner(null);
    }
  }

  function submit(values: Values) {
    setBanner(null);
    startTransition(async () => {
      const result = await createQuest(values);
      if (result.ok) {
        onCreated(result.data);
        onOpenChange(false);
        return;
      }
      const { message, fields } = result.error;
      if (Object.keys(fields).length === 0) setBanner(message);
      for (const [field, text] of Object.entries(fields)) {
        if (field === "title" || field === "description") setError(field, { message: text });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          New quest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-1">
          <DialogTitle>New quest</DialogTitle>
          <DialogDescription>A quest groups challenges, for example by city.</DialogDescription>
        </div>
        {banner ? (
          <div
            role="alert"
            className="border-alert-error-border bg-alert-error text-alert-error-foreground rounded-lg border px-3.5 py-2.5 text-sm"
          >
            {banner}
          </div>
        ) : null}
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            // This dialog is rendered in a portal, so React would hand its submit to the
            // challenge form around it.
            event.stopPropagation();
            void handleSubmit(submit)(event);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-title">Title</Label>
            <Input
              id="quest-title"
              placeholder="Hue Heritage"
              maxLength={120}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "quest-title-error" : undefined}
              {...register("title")}
            />
            {errors.title ? (
              <p id="quest-title-error" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-description">
              Description <span className="text-muted-foreground font-normal">optional</span>
            </Label>
            <Textarea
              id="quest-description"
              rows={3}
              placeholder="Challenges around the old capital."
              maxLength={2000}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? "quest-description-error" : undefined}
              {...register("description")}
            />
            {errors.description ? (
              <p id="quest-description-error" className="text-destructive text-sm">
                {errors.description.message}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {pending ? "Creating…" : "Create quest"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
