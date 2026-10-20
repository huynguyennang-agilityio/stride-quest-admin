"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Clock, Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { signIn } from "../actions";
import { signInSchema, type SignInValues } from "../schema";

type Banner = { code: string; message: string };

const BANNER_STYLES = {
  error: "border-alert-error-border bg-alert-error text-alert-error-foreground",
  warning: "border-alert-warning-border bg-alert-warning text-alert-warning-foreground",
};

function BannerIcon({ code }: { code: string }) {
  const props = { className: "mt-px size-[18px] flex-none", "aria-hidden": true as const };
  if (code === "rate_limited") return <Clock {...props} />;
  if (code === "not_admin") return <Lock {...props} />;
  return <CircleAlert {...props} />;
}

/** Email and password form of the sign-in page. `next` is the page to go back to. */
export function LoginForm({ next }: { next?: string }) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    setBanner(null);
    startTransition(async () => {
      // On success the action redirects, so it only returns a failure.
      const result = await signIn(values, next);
      if (result.ok) return;
      const { code, message, fields } = result.error;
      setBanner({ code, message });
      for (const [field, text] of Object.entries(fields)) {
        if (field === "email" || field === "password") setError(field, { message: text });
      }
    });
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Sign in</h1>
        <p className="text-muted-foreground text-[15px]">Admin accounts only.</p>
      </div>

      {banner ? (
        <div
          role="alert"
          className={cn(
            "flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-normal",
            banner.code === "rate_limited" ? BANNER_STYLES.warning : BANNER_STYLES.error,
          )}
        >
          <BannerIcon code={banner.code} />
          <span>{banner.message}</span>
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" className="text-destructive text-sm">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div
            className={cn(
              "border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex items-center rounded-lg border pr-1 focus-within:ring-[3px]",
              errors.password && "border-destructive",
            )}
          >
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="At least 8 characters"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-[42px] flex-1 border-0 bg-transparent focus-visible:ring-0"
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-10"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {errors.password ? (
            <p id="password-error" className="text-destructive text-sm">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="mt-1 h-11 text-[15px]"
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground text-[13px] leading-normal">
        Password reset isn&apos;t available yet. If you&apos;re locked out, ask an operator.
      </p>
    </div>
  );
}
