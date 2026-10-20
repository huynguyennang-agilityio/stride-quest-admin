import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/** A native `<select>` (it works with every keyboard and screen reader) in the form's look. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative min-w-0 flex-1">
      <select
        data-slot="select"
        className={cn(
          "border-input bg-card text-foreground h-11 w-full appearance-none rounded-lg border pr-9 pl-3 text-[15px] transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}

export { Select };
