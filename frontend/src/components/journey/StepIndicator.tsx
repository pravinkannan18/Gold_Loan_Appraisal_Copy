import { User, Camera, Shield, FlaskConical, FileText } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: 'Appraiser Image', icon: User },
  { number: 2, label: 'Customer Image', icon: Camera },
  { number: 3, label: 'RBI Compliance Image', icon: Shield },
  { number: 4, label: 'Purity Testing', icon: FlaskConical },
  { number: 5, label: 'Summary', icon: FileText },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/85 dark:bg-slate-900/70 backdrop-blur-lg px-4 py-3 shadow-sm shadow-blue-200/30 dark:shadow-blue-950/30">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;
            const isPending = currentStep < step.number;

            return (
              <div key={step.number} className="group flex items-center flex-1 gap-3">
                <div className="relative flex flex-row items-center justify-center gap-3 flex-1 transition-all duration-500 ease-out">
                  {isActive && (
                    <>
                      <div className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 flex-col items-center">
                        <div className="h-7 w-24 rounded-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent blur-lg" />
                        <div className="-mt-3 h-9 w-9 rounded-full bg-blue-500/60 blur-xl" />
                      </div>
                      <div className="pointer-events-none absolute -top-1 left-1/2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-blue-500/70 to-transparent blur-sm animate-pulse" />
                    </>
                  )}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-500 ease-out ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/40 scale-100'
                        : isActive
                        ? 'bg-gradient-to-br from-blue-500/40 via-blue-400/25 to-blue-300/15 border-blue-300/70 shadow-lg shadow-blue-500/40 backdrop-blur-md scale-105 ring-2 ring-blue-400/40'
                        : 'bg-white/80 border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800/70 backdrop-blur-sm group-hover:border-blue-400/40 group-hover:shadow-blue-200/30'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-all duration-300 ${
                        isCompleted
                          ? 'text-white'
                          : isActive
                          ? 'text-blue-600 drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold tracking-wide whitespace-nowrap ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : isActive
                        ? 'text-blue-600 dark:text-blue-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        currentStep > step.number
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400'
                          : isActive
                          ? 'bg-gradient-to-r from-blue-500/35 via-blue-400/25 to-blue-500/35 animate-pulse'
                          : 'bg-slate-200/80 dark:bg-slate-700/80'
                      } ${isPending ? 'opacity-60' : ''}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}
