"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/features/images/components/image-upload";
import { cn } from "@/lib/utils";

import { EMPTY_MEDAL, type ChallengeFormValues } from "../form";
import { MEDAL_TIERS, TIER_LABELS, type MedalTier } from "../request-schema";
import { unitFor } from "../units";
import { controlProps, Field, useFieldError, useFrozen } from "./form-parts";

const DOT: Record<MedalTier, string> = {
  bronze: "bg-[#b8763a]",
  silver: "bg-[#8a96a2]",
  gold: "bg-[#c99a1c]",
};

function MedalRow({ tier }: { tier: MedalTier }) {
  const { register, watch, setValue, formState } = useFormContext<ChallengeFormValues>();
  const medal = watch(`medals.${tier}`);
  const unit = unitFor(watch("type"));
  const label = TIER_LABELS[tier].toLowerCase();
  const nameError = useFieldError(`medals.${tier}.name`);
  const thresholdError = useFieldError(`medals.${tier}.threshold`);
  const imageError = useFieldError(`medals.${tier}.imageUrl`);
  const hasError = Boolean(nameError || thresholdError || imageError);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[10px] border p-3.5",
        hasError ? "border-destructive/40 bg-alert-error/40" : "bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={cn("size-3.5 rounded-full", DOT[tier])} aria-hidden="true" />
        {TIER_LABELS[tier]}
      </div>
      {medal.enabled ? (
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Image</span>
            <ImageUpload
              kind="medals"
              shape="medal"
              label={`${label} medal image`}
              value={medal.imageUrl ? { url: medal.imageUrl, name: medal.imageName } : null}
              error={imageError}
              onChange={(image) => {
                const options = { shouldDirty: true, shouldValidate: formState.isSubmitted };
                setValue(`medals.${tier}.imageUrl`, image?.url ?? "", options);
                setValue(`medals.${tier}.imageName`, image?.name ?? "", options);
              }}
            />
          </div>
          <Field
            id={`medal-${tier}-name`}
            label="Name"
            error={nameError}
            className="min-w-[180px] flex-1"
          >
            <Input
              maxLength={120}
              {...controlProps(`medal-${tier}-name`, nameError)}
              {...register(`medals.${tier}.name`)}
            />
          </Field>
          <Field
            id={`medal-${tier}-threshold`}
            label="Earned at"
            error={thresholdError}
            className="w-[170px]"
          >
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                {...controlProps(`medal-${tier}-threshold`, thresholdError)}
                {...register(`medals.${tier}.threshold`)}
              />
              <span className="text-muted-foreground text-sm">{unit}</span>
            </div>
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground mt-6"
            aria-label={`Remove ${label} medal`}
            onClick={() => setValue(`medals.${tier}`, EMPTY_MEDAL, { shouldDirty: true })}
          >
            <Trash2 />
          </Button>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValue(`medals.${tier}.enabled`, true, { shouldDirty: true })}
          >
            Add {label} medal
          </Button>
        </div>
      )}
    </div>
  );
}

/** The medals as they are, when they can't change. */
function FrozenMedals() {
  const { watch } = useFormContext<ChallengeFormValues>();
  const medals = watch("medals");
  const unit = unitFor(watch("type"));
  const set = MEDAL_TIERS.filter((tier) => medals[tier].enabled);
  if (set.length === 0) return <p className="text-muted-foreground text-sm">No medals.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {set.map((tier) => (
        <li key={tier} className="bg-muted/40 flex items-center gap-3 rounded-[10px] border p-3.5">
          <Image
            src={medals[tier].imageUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 flex-none object-contain"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold">{medals[tier].name}</span>
            <span className="text-muted-foreground text-xs">{TIER_LABELS[tier]}</span>
          </div>
          <span className="text-sm tabular-nums">
            {medals[tier].threshold} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MedalsEditor() {
  const summary = useFieldError("medals");
  const frozen = useFrozen();
  if (frozen) return <FrozenMedals />;
  return (
    <div className="flex flex-col gap-3">
      {MEDAL_TIERS.map((tier) => (
        <MedalRow key={tier} tier={tier} />
      ))}
      {typeof summary === "string" ? (
        <p role="alert" className="text-destructive text-sm">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
