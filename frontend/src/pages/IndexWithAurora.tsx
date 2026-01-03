import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Gem, 
  Shield, 
  TrendingUp, 
  Camera, 
  FileText, 
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Photo Capture",
      description: "High-quality jewelry imaging for accurate assessment"
    },
    {
      icon: TrendingUp,
      title: "Real-time Valuation",
      description: "Instant gold price calculations based on current market rates"
    },
    {
      icon: FileText,
      title: "Digital Records",
      description: "Secure cloud storage of all appraisal documents"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Bank-grade security with regulatory compliance"
    }
  ];

  const stats = [
    { value: "10,000+", label: "Appraisals Completed" },
    { value: "99.9%", label: "Accuracy Rate" },
    { value: "24/7", label: "System Availability" },
    { value: "5 Min", label: "Average Processing Time" }
  ];

  const benefits = [
    "AI-powered weight and purity estimation",
    "Automated market rate integration",
    "Comprehensive audit trail",
    "Multi-branch synchronization",
    "Customer portal access",
    "PDF report generation"
  ];

  return (
    <AuroraBackground>
      <div className="relative z-10 w-full min-h-screen overflow-y-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="container mx-auto px-4 py-16 md:py-24"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <Gem className="w-20 h-20 md:w-24 md:h-24 text-yellow-500 dark:text-yellow-400" />
              <div className="absolute -top-1 -right-1">
                <Award className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center mb-6"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-600 dark:from-neutral-50 dark:via-neutral-200 dark:to-neutral-400">
              Gold Guardian Pro
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light text-neutral-700 dark:text-neutral-300">
              Professional Gold Loan Appraisal System
            </p>
          </motion.div>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-12"
          >
            Transform your gold loan operations with AI-powered jewelry appraisal, 
            real-time valuations, and comprehensive record management.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap gap-4 items-center justify-center mb-12"
          >
            <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-5 py-3 rounded-full border-2 border-neutral-200 dark:border-neutral-700 shadow-lg">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold dark:text-neutral-200 text-neutral-800">
                Bank-Grade Security
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-5 py-3 rounded-full border-2 border-neutral-200 dark:border-neutral-700 shadow-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold dark:text-neutral-200 text-neutral-800">
                Real-time Market Rates
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-5 py-3 rounded-full border-2 border-neutral-200 dark:border-neutral-700 shadow-lg">
              <Camera className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-semibold dark:text-neutral-200 text-neutral-800">
                AI-Powered Analysis
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-5 py-3 rounded-full border-2 border-neutral-200 dark:border-neutral-700 shadow-lg">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold dark:text-neutral-200 text-neutral-800">
                5-Minute Processing
              </span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button
              size="lg"
              onClick={() => navigate("/new-appraisal")}
              className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:via-amber-600 hover:to-yellow-700 text-white dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-500 dark:hover:from-yellow-500 dark:hover:via-amber-500 dark:hover:to-yellow-600 px-10 py-7 text-lg font-semibold rounded-full shadow-2xl hover:shadow-yellow-500/50 transition-all transform hover:scale-105"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start New Appraisal
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border-2 border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-zinc-800 px-10 py-7 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <FileText className="w-5 h-5 mr-2" />
              View Dashboard
            </Button>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
              >
                <Card className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm border-2 border-neutral-200 dark:border-neutral-700 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-yellow-500 to-amber-600 dark:from-yellow-400 dark:to-amber-500 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + index * 0.1, duration: 0.4 }}
              >
                <Card className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm border-2 border-neutral-200 dark:border-neutral-700 shadow-lg hover:shadow-2xl transition-all h-full group hover:scale-105">
                  <CardContent className="p-6">
                    <div className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm border-2 border-neutral-200 dark:border-neutral-700 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    Key Features
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + index * 0.05, duration: 0.3 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                        {benefit}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="text-center mt-16"
          >
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Ready to streamline your gold loan operations?
            </p>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-lg font-semibold hover:bg-white/50 dark:hover:bg-zinc-800/50"
            >
              Sign In to Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
};

export default Index;
