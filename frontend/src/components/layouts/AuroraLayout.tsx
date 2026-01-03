import { AuroraBackground } from "@/components/ui/aurora-background";
import { ReactNode } from "react";

interface AuroraLayoutProps {
  children: ReactNode;
  showRadialGradient?: boolean;
  className?: string;
}

/**
 * Aurora Layout Template
 * 
 * A reusable layout wrapper that adds the Aurora background effect to any page.
 * 
 * Usage:
 * ```tsx
 * import { AuroraLayout } from "@/components/layouts/AuroraLayout";
 * 
 * function MyPage() {
 *   return (
 *     <AuroraLayout>
 *       <div className="max-w-4xl mx-auto p-8">
 *         Your page content here
 *       </div>
 *     </AuroraLayout>
 *   );
 * }
 * ```
 */
export function AuroraLayout({ 
  children, 
  showRadialGradient = true,
  className 
}: AuroraLayoutProps) {
  return (
    <AuroraBackground 
      showRadialGradient={showRadialGradient}
      className={className}
    >
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </AuroraBackground>
  );
}
