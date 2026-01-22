import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border/50 bg-card text-card-foreground",
      "shadow-card transition-all duration-300",
      "hover:shadow-card-hover hover:-translate-y-0.5",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-none tracking-tight text-primary font-poppins",
        className
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

// New: Feature Card for dashboard highlights
const FeatureCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  accentColor?: "primary" | "secondary" | "success" | "warning";
}>(({ className, icon, accentColor = "primary", children, ...props }, ref) => {
  const accentStyles = {
    primary: "border-l-primary",
    secondary: "border-l-secondary",
    success: "border-l-success",
    warning: "border-l-warning",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/50 bg-card text-card-foreground",
        "shadow-card transition-all duration-300",
        "hover:shadow-card-hover hover:-translate-y-1",
        "border-l-4",
        accentStyles[accentColor],
        className
      )}
      {...props}
    >
      {icon && (
        <div className="p-6 pb-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            {icon}
          </div>
        </div>
      )}
      {children}
    </div>
  );
});
FeatureCard.displayName = "FeatureCard";

// New: Stat Card for metrics display
const StatCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
}>(({ className, label, value, trend, icon, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border/50 bg-card text-card-foreground p-6",
      "shadow-card transition-all duration-300",
      "hover:shadow-card-hover",
      className
    )}
    {...props}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-primary font-poppins">{value}</p>
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1 text-sm font-medium",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/20">
          {icon}
        </div>
      )}
    </div>
  </div>
));
StatCard.displayName = "StatCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, FeatureCard, StatCard };
