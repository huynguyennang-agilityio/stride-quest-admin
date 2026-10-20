"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Label } from "@/components/ui/label";

import { cleanQuery, MAX_QUERY_LENGTH } from "../schema";

const DEBOUNCE_MS = 300;

/** The search of the list: it waits for a pause in typing, then puts `q` in the URL. */
export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  // "Clear filters" changes the URL: follow it, unless the person is typing.
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) {
      input.current.value = defaultValue;
    }
  }, [defaultValue]);

  function onChange(value: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("cursor");
      const q = cleanQuery(value);
      if (q) next.set("q", q);
      else next.delete("q");
      const text = next.toString();
      router.replace(text ? `/challenges?${text}` : "/challenges", { scroll: false });
    }, DEBOUNCE_MS);
  }

  return (
    <div className="bg-card focus-within:border-ring focus-within:ring-ring/40 flex h-10 flex-1 basis-[280px] items-center gap-2 rounded-lg border px-3 focus-within:ring-[3px]">
      <Search className="text-muted-foreground size-4" aria-hidden="true" />
      <Label htmlFor="q" className="sr-only">
        Search challenges
      </Label>
      <input
        ref={input}
        id="q"
        type="search"
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_LENGTH}
        placeholder="Search title, city or landmark"
        onChange={(event) => onChange(event.target.value)}
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}
