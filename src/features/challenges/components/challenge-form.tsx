"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { FormProvider, useForm, useFormContext, type Path } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/features/images/components/image-upload";
import { NewQuestDialog } from "@/features/quests/components/new-quest-dialog";
import type { Quest } from "@/features/quests/queries";
import { useBrowserTimeZone } from "@/lib/use-browser-time-zone";
import { timeZoneLabel } from "@/lib/time-zone";
import { cn } from "@/lib/utils";

import { createChallenge } from "../actions";
import { challengeResolver, EMPTY_FORM, toRequest, type ChallengeFormValues } from "../form";
import { CHALLENGE_TYPES, type ChallengeType } from "../schema";
import { TYPE_LABELS } from "../mappers";
import { AMOUNT_HINTS, unitFor } from "../units";
import { DescriptionField } from "./description-field";
import { controlProps, Field, Section, useFieldError } from "./form-parts";
import { MedalsEditor } from "./medals-editor";

const useFormContextValues = () => useFormContext<ChallengeFormValues>();

const TYPE_HINTS: Record<ChallengeType, string> = {
  run: "Counted in steps",
  swim: "Distance, in km",
  cycle: "Distance, in km",
};

function TypePicker() {
  const { register, watch } = useFormContextValues();
  const selected = watch("type");
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm leading-none font-medium">Type</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHALLENGE_TYPES.map((type) => (
          <label
            key={type}
            className={cn(
              "focus-within:ring-ring/40 flex min-h-16 cursor-pointer flex-col items-start gap-0.5 rounded-[10px] border p-3 text-left focus-within:ring-[3px]",
              selected === type ? "border-primary bg-primary/10 border-2 p-[11px]" : "bg-card",
            )}
          >
            <input type="radio" value={type} className="sr-only" {...register("type")} />
            <span className="text-[15px] font-semibold">{TYPE_LABELS[type]}</span>
            <span className="text-muted-foreground text-[13px]">{TYPE_HINTS[type]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Basics({
  quests,
  onQuestCreated,
}: {
  quests: Quest[];
  onQuestCreated: (quest: Quest) => void;
}) {
  const { register, watch } = useFormContextValues();
  const unit = unitFor(watch("type"));
  const titleError = useFieldError("title");
  const targetError = useFieldError("target");
  const questError = useFieldError("questId");

  return (
    <Section title="Basics">
      <Field id="title" label="Title" hint="One line, up to 120 characters." error={titleError}>
        <Input
          maxLength={120}
          {...controlProps("title", titleError, true)}
          {...register("title")}
        />
      </Field>
      <TypePicker />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="target" label="Target" hint={AMOUNT_HINTS[unit]} error={targetError}>
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              {...controlProps("target", targetError, true)}
              {...register("target")}
            />
            <span className="text-muted-foreground text-sm">{unit}</span>
          </div>
        </Field>
        <Field id="quest" label="Quest" error={questError}>
          <div className="flex items-center gap-2">
            <Select {...controlProps("quest", questError)} {...register("questId")}>
              <option value="">Default quest</option>
              {quests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </Select>
            <NewQuestDialog onCreated={onQuestCreated} />
          </div>
        </Field>
      </div>
    </Section>
  );
}

function Schedule() {
  const { register } = useFormContextValues();
  const timeZone = useBrowserTimeZone();
  const startsError = useFieldError("startsAt");
  const endsError = useFieldError("endsAt");

  return (
    <Section title="Schedule" note={`Times are in your timezone, ${timeZoneLabel(timeZone)}`}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="starts" label="Starts" error={startsError}>
          <Input
            type="datetime-local"
            {...controlProps("starts", startsError)}
            {...register("startsAt")}
          />
        </Field>
        <Field id="ends" label="Ends" error={endsError}>
          <Input
            type="datetime-local"
            {...controlProps("ends", endsError)}
            {...register("endsAt")}
          />
        </Field>
      </div>
    </Section>
  );
}

function Place() {
  const { register } = useFormContextValues();
  const cityError = useFieldError("city");
  const landmarkError = useFieldError("landmark");

  return (
    <Section
      title={
        <>
          Place <span className="text-muted-foreground text-[13px] font-normal">optional</span>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="City" error={cityError}>
          <Input maxLength={120} {...controlProps("city", cityError)} {...register("city")} />
        </Field>
        <Field id="landmark" label="Landmark" error={landmarkError}>
          <Input
            maxLength={120}
            {...controlProps("landmark", landmarkError)}
            {...register("landmark")}
          />
        </Field>
      </div>
    </Section>
  );
}

function Cover() {
  const { watch, setValue, formState } = useFormContextValues();
  const url = watch("coverImageUrl");
  const name = watch("coverImageName");
  const error = useFieldError("coverImageUrl");

  return (
    <Section
      title="Cover image"
      note="JPEG, PNG or WebP, up to 5 MB. 1600 × 900 looks best. Needed to publish."
    >
      <ImageUpload
        kind="covers"
        label="cover image"
        value={url ? { url, name } : null}
        error={error}
        onChange={(image) => {
          const options = { shouldDirty: true, shouldValidate: formState.isSubmitted };
          setValue("coverImageUrl", image?.url ?? "", options);
          setValue("coverImageName", image?.name ?? "", options);
        }}
      />
    </Section>
  );
}

function Terms() {
  const { register } = useFormContextValues();
  const error = useFieldError("terms");

  return (
    <Field id="terms" label="Terms" error={error}>
      <Textarea
        rows={3}
        maxLength={20000}
        {...controlProps("terms", error)}
        {...register("terms")}
      />
    </Field>
  );
}

type Props = { quests: Quest[] };

/** The form of a new challenge (design canvas, "New challenge"). It creates a draft. */
export function ChallengeForm({ quests: initialQuests }: Props) {
  const [quests, setQuests] = useState(initialQuests);
  const [banner, setBanner] = useState<{ message: string; details: string[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ChallengeFormValues>({
    resolver: challengeResolver,
    defaultValues: EMPTY_FORM,
  });

  function onSubmit(values: ChallengeFormValues) {
    setBanner(null);
    startTransition(async () => {
      // On success the action redirects, so it only returns a failure.
      const result = await createChallenge(toRequest(values).request);
      if (result.ok) return;
      const { message, fields } = result.error;
      const details: string[] = [];
      for (const [path, text] of Object.entries(fields)) {
        if (path === "root") details.push(text);
        else form.setError(path as Path<ChallengeFormValues>, { type: "server", message: text });
      }
      setBanner({ message, details });
    });
  }

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {banner ? (
          <div
            role="alert"
            className="border-alert-error-border bg-alert-error text-alert-error-foreground flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
          >
            <CircleAlert className="mt-px size-[18px] flex-none" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span>{banner.message}</span>
              {banner.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </div>
          </div>
        ) : null}

        <Basics
          quests={quests}
          onQuestCreated={(quest) => {
            // The option has to be in the select before the select can take its value.
            flushSync(() => setQuests((current) => [...current, quest]));
            form.setValue("questId", String(quest.id), { shouldDirty: true });
          }}
        />
        <Schedule />
        <Place />
        <Cover />
        <Section title="Description and terms">
          <DescriptionField />
          <Terms />
        </Section>
        <Section
          title="Medals"
          note="Up to three, one per tier. Each medal needs a name, an image (JPEG, PNG or WebP, up to 5 MB; a square PNG with a transparent background looks best) and the steps or distance it's earned at. Each tier asks for more than the one below, and gold is earned at the target. At least one is needed to publish."
        >
          <MedalsEditor />
        </Section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/challenges" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="h-11 font-semibold"
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            {pending ? "Creating…" : "Create draft"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
