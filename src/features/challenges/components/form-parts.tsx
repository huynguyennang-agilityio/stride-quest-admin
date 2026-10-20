import { createContext, useContext } from "react";
import { get, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { ChallengeFormValues } from "../form";

/**
 * True while people are in the challenge: its type, target, dates and medals are what they
 * count toward, so the form shows them and doesn't let them change.
 */
export const FrozenContext = createContext(false);
export const useFrozen = () => useContext(FrozenContext);

export function Section({
  title,
  note,
  children,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-5 rounded-xl border p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {note ? <p className="text-muted-foreground text-[13px] leading-normal">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** The message of a form field, by its path, when it has an error. */
export function useFieldError(path: string): string | undefined {
  const {
    formState: { errors },
  } = useFormContext<ChallengeFormValues>();
  return get(errors, path)?.message as string | undefined;
}

/** The ids and ARIA attributes that tie a control to its hint and its error. */
export function controlProps(id: string, error: string | undefined, hint?: boolean) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  /** `null` when something else labels the control. */
  label: React.ReactNode | null;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label === null ? null : (
        <Label htmlFor={id}>
          {label}
          {optional ? <span className="text-muted-foreground font-normal"> optional</span> : null}
        </Label>
      )}
      {children}
      {hint ? (
        <span id={`${id}-hint`} className="text-muted-foreground text-[13px]">
          {hint}
        </span>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
