import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Deep Blue with white text
        default: "bg-primary text-primary-foreground shadow-button hover:bg-primary/90 hover:shadow-button-hover btn-hover-lift",
        // Secondary: Bright Yellow with deep blue text  
        secondary: "bg-secondary text-secondary-foreground font-semibold shadow-md hover:bg-secondary/90 hover:shadow-lg",
        // Destructive: Red for danger actions
        destructive: "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90",
        // Outline: Bordered style
        outline: "border-2 border-primary text-primary bg-transparent hover:bg-primary/5",
        // Ghost: Minimal style
        ghost: "text-primary hover:bg-primary/5 hover:text-primary",
        // Link: Text-only style
        link: "text-primary underline-offset-4 hover:underline",
        // Success: Green for positive actions
        success: "bg-success text-success-foreground shadow-md hover:bg-success/90",
        // Warning: Amber for caution
        warning: "bg-warning text-warning-foreground shadow-md hover:bg-warning/90",
      },
      size: {
        default: "h-12 px-8 py-2.5",
        sm: "h-10 px-5 text-xs rounded-lg",
        lg: "h-14 px-10 text-base rounded-xl",
        xl: "h-16 px-12 text-lg rounded-2xl",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
