"use client";

import { motion } from "framer-motion";
import React from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { Camera, FileText, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AuroraBackgroundDemo() {
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
        className="relative flex flex-col gap-6 items-center justify-center px-4 max-w-5xl"
      >
        {/* Logo with Image */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          whileInView={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.5,
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="mb-4"
        >
          <div className="relative">
            <Gem className="w-24 h-24 text-yellow-500 dark:text-yellow-400" />
          </div>
        </motion.div>

        {/* Decorative Gold Jewelry Images */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.6,
            duration: 0.8,
          }}
          className="flex gap-4 mb-6"
        >
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-xl" />
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-xl" />
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-500 shadow-xl" />
        </motion.div>

        {/* Main Heading */}
        <div className="text-4xl md:text-7xl font-bold dark:text-white text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-neutral-50 dark:to-neutral-400">
          Professional Gold Appraisal
        </div>

        {/* Subheading */}
        <div className="font-light text-lg md:text-3xl dark:text-neutral-200 text-neutral-700 py-4 text-center max-w-3xl">
          AI-powered jewelry valuation with real-time market rates and comprehensive digital records
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-lg">
            <Camera className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-semibold">Photo Capture</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-lg">
            <Gem className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-semibold">Purity Analysis</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-lg">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold">Digital Records</span>
          </div>
        </div>

        {/* Sample Images Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8,
            duration: 0.6,
          }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {/* Gold jewelry themed gradient boxes representing images */}
          <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 shadow-2xl flex items-center justify-center">
            <Gem className="w-12 h-12 text-white/80" />
          </div>
          <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-2xl flex items-center justify-center">
            <Gem className="w-12 h-12 text-white/80" />
          </div>
          <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-2xl flex items-center justify-center">
            <Gem className="w-12 h-12 text-white/80" />
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <div className="flex gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/new-appraisal")}
            className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white px-8 py-6 text-lg rounded-full shadow-2xl"
          >
            <Camera className="w-5 h-5 mr-2" />
            Start Appraisal
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border-2 px-8 py-6 text-lg rounded-full shadow-xl"
          >
            View Dashboard
          </Button>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
