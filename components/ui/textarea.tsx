import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-32 w-full resize-none rounded-md border border-[#D7CABF] bg-white px-4 py-3 text-sm leading-6 text-brand-ink shadow-sm outline-none transition placeholder:text-[#787E89] focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
