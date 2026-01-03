/**
 * Aurora Background Test Page
 * 
 * This is a simple test page to verify the Aurora Background component integration.
 * You can add this to your router to quickly test the component.
 * 
 * To use:
 * 1. Import this component in your App.tsx or router configuration
 * 2. Add a route: <Route path="/aurora-test" element={<AuroraTest />} />
 * 3. Navigate to http://localhost:5173/aurora-test
 */

import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Gem, Sparkles, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuroraTest() {
  const navigate = useNavigate();

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-2xl text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.5,
            duration: 0.6,
            ease: "easeInOut",
          }}
        >
          <Gem className="w-20 h-20 text-yellow-500 dark:text-yellow-400" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-bold dark:text-white text-neutral-900">
            Aurora Background
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300">
            ✅ Successfully Integrated!
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Animated Gradients
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Dark Mode Ready
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <Gem className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Fully Responsive
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl">
          This beautiful aurora background effect uses pure CSS animations powered by Tailwind CSS. 
          It's GPU-accelerated, performant, and works seamlessly with your existing design system.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Go to Dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-2 border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-zinc-800 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Back Home
          </Button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-lg border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <strong>💡 Tip:</strong> Toggle dark mode to see the aurora adapt to your theme!
          </p>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
