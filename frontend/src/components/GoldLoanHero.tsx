"use client";

import { motion } from "framer-motion";
import React from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { Gem, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GoldLoanHero() {
  const navigate = useNavigate();

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-4xl"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{
            delay: 0.5,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="mb-4"
        >
          <Gem className="w-20 h-20 text-yellow-500 dark:text-yellow-400" />
        </motion.div>

        {/* Main Heading */}
        <div className="text-4xl md:text-7xl font-bold dark:text-white text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-neutral-50 dark:to-neutral-400">
          Gold Loan Appraisal
        </div>

        {/* Subheading */}
        <div className="font-light text-lg md:text-2xl dark:text-neutral-200 text-neutral-700 py-4 text-center max-w-2xl">
          Professional gold jewelry appraisal system with AI-powered valuation
          and comprehensive record management.
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-4 items-center justify-center mb-4">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Secure & Reliable
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Real-time Valuation
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700">
            <Gem className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium dark:text-neutral-200 text-neutral-700">
              Expert Analysis
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            size="lg"
            onClick={() => navigate("/new-appraisal")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Start New Appraisal
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-2 border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-zinc-800 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            View Dashboard
          </Button>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
