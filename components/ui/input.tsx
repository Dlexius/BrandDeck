import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-[#D7CABF] bg-white px-3 text-sm text-brand-ink shadow-sm outline-none transition file:mr-3 file:rounded-sm file:border-0 file:bg-brand-fog file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-ink focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
