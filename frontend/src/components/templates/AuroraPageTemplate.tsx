import { AuroraBackground } from "@/components/ui/aurora-background";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AuroraPageTemplateProps {
  children: ReactNode;
  showRadialGradient?: boolean;
  animateContent?: boolean;
  contentClassName?: string;
}

/**
 * Aurora Page Template
 * 
 * A complete page template with Aurora background and optional content animation.
 * Perfect for full-page forms, dashboards, or content pages.
 * 
 * Usage:
 * ```tsx
 * import { AuroraPageTemplate } from "@/components/templates/AuroraPageTemplate";
 * 
 * function MyPage() {
 *   return (
 *     <AuroraPageTemplate animateContent>
 *       <Card className="max-w-2xl mx-auto">
 *         <CardHeader>
 *           <CardTitle>My Page Title</CardTitle>
 *         </CardHeader>
 *         <CardContent>
 *           Your content here
 *         </CardContent>
 *       </Card>
 *     </AuroraPageTemplate>
 *   );
 * }
 * ```
 */
export function AuroraPageTemplate({ 
  children, 
  showRadialGradient = true,
  animateContent = true,
  contentClassName = "flex items-center justify-center p-4"
}: AuroraPageTemplateProps) {
  
  const content = animateContent ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={contentClassName}
    >
      {children}
    </motion.div>
  ) : (
    <div className={contentClassName}>
      {children}
    </div>
  );

  return (
    <AuroraBackground showRadialGradient={showRadialGradient}>
      {content}
    </AuroraBackground>
  );
}
