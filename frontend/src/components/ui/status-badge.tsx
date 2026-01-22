import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
    {
        variants: {
            variant: {
                live: "bg-secondary text-secondary-foreground animate-pulse-glow",
                success: "bg-success/10 text-success border border-success/20",
                warning: "bg-warning/10 text-warning border border-warning/20",
                error: "bg-destructive/10 text-destructive border border-destructive/20",
                info: "bg-info/10 text-info border border-info/20",
                default: "bg-muted text-muted-foreground",
                primary: "bg-primary/10 text-primary border border-primary/20",
            },
            size: {
                sm: "px-2 py-0.5 text-[10px]",
                default: "px-3 py-1 text-xs",
                lg: "px-4 py-1.5 text-sm",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
    icon?: React.ReactNode;
    pulse?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
    ({ className, variant, size, icon, pulse, children, ...props }, ref) => (
        <span
            ref={ref}
            className={cn(
                statusBadgeVariants({ variant, size }),
                pulse && "animate-pulse",
                className
            )}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </span>
    )
);
StatusBadge.displayName = "StatusBadge";

// Live indicator with glowing dot
const LiveBadge = React.forwardRef<HTMLSpanElement, Omit<StatusBadgeProps, "variant">>(
    ({ className, children = "LIVE", ...props }, ref) => (
        <StatusBadge
            ref={ref}
            variant="live"
            className={cn("font-bold tracking-wide", className)}
            icon={
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-foreground opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-foreground"></span>
                </span>
            }
            {...props}
        >
            {children}
        </StatusBadge>
    )
);
LiveBadge.displayName = "LiveBadge";

// Connection status badge
interface ConnectionBadgeProps extends Omit<StatusBadgeProps, "variant"> {
    status: "connected" | "connecting" | "disconnected";
}

const ConnectionBadge = React.forwardRef<HTMLSpanElement, ConnectionBadgeProps>(
    ({ status, className, ...props }, ref) => {
        const config = {
            connected: { variant: "success" as const, label: "Connected", icon: "●" },
            connecting: { variant: "warning" as const, label: "Connecting...", icon: "◐" },
            disconnected: { variant: "error" as const, label: "Disconnected", icon: "○" },
        };

        const { variant, label, icon } = config[status];

        return (
            <StatusBadge
                ref={ref}
                variant={variant}
                className={cn(status === "connecting" && "animate-pulse", className)}
                icon={<span className="text-current">{icon}</span>}
                {...props}
            >
                {label}
            </StatusBadge>
        );
    }
);
ConnectionBadge.displayName = "ConnectionBadge";

// Step/Progress badge
interface StepBadgeProps extends Omit<StatusBadgeProps, "variant"> {
    step: number;
    total: number;
    completed?: boolean;
}

const StepBadge = React.forwardRef<HTMLSpanElement, StepBadgeProps>(
    ({ step, total, completed, className, ...props }, ref) => (
        <StatusBadge
            ref={ref}
            variant={completed ? "success" : "primary"}
            className={className}
            {...props}
        >
            Step {step} of {total}
        </StatusBadge>
    )
);
StepBadge.displayName = "StepBadge";

export { StatusBadge, statusBadgeVariants, LiveBadge, ConnectionBadge, StepBadge };
