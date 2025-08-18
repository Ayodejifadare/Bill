"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch@1.1.3";

import { cn } from "./utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default" | "lg";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        // Mobile-first sizing with proper touch targets
        "touch-manipulation active:scale-95",
        // Size variants with mobile optimization
        "data-[size=sm]:h-5 data-[size=sm]:w-9",
        "data-[size=default]:h-6 data-[size=default]:w-11", 
        "data-[size=lg]:h-7 data-[size=lg]:w-12",
        // Ensure minimum touch target on mobile
        "min-h-[24px] min-w-[44px]",
        // Enhanced visual feedback
        "hover:shadow-sm active:shadow-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform shadow-sm",
          // Size-responsive thumb sizing
          "data-[size=sm]:size-4 data-[size=sm]:data-[state=checked]:translate-x-4 data-[size=sm]:data-[state=unchecked]:translate-x-0.5",
          "data-[size=default]:size-5 data-[size=default]:data-[state=checked]:translate-x-5 data-[size=default]:data-[state=unchecked]:translate-x-0.5",
          "data-[size=lg]:size-6 data-[size=lg]:data-[state=checked]:translate-x-5 data-[size=lg]:data-[state=unchecked]:translate-x-0.5",
          // Default responsive sizing
          "size-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };