import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-brand-orange text-white shadow-sm hover:bg-[#e64a00] focus-visible:outline-brand-orange",
          variant === "secondary" &&
            "border border-[#D7CABF] bg-white text-brand-ink hover:bg-[#F7F4F1] focus-visible:outline-brand-orange",
          variant === "ghost" &&
            "bg-transparent text-brand-ink hover:bg-[#F3F3F3] focus-visible:outline-brand-orange",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
