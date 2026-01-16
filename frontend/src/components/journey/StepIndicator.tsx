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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 rounded-2xl border border-[#101585]/20 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-md shadow-[#101585]/10 dark:shadow-[#101585]/20">
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
                      <div className="h-7 w-24 rounded-full bg-gradient-to-r from-transparent via-[#A78BFA]/50 to-transparent blur-lg" />
                      <div className="-mt-3 h-9 w-9 rounded-full bg-[#101585]/60 blur-xl" />
                    </div>
                    <div className="pointer-events-none absolute -top-1 left-1/2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#FFDD44]/70 to-transparent blur-sm animate-pulse" />
                  </>
                )}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-500 ease-out ${isCompleted
                      ? 'bg-gradient-to-br from-[#101585] to-[#A78BFA] border-[#A78BFA] shadow-lg shadow-[#101585]/40 scale-100'
                      : isActive
                        ? 'bg-gradient-to-br from-[#101585]/40 via-[#A78BFA]/25 to-[#FFDD44]/15 border-[#FFDD44]/70 shadow-lg shadow-[#FFDD44]/40 backdrop-blur-md scale-105 ring-2 ring-[#FFDD44]/40'
                        : 'bg-white/80 border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800/70 backdrop-blur-sm group-hover:border-[#A78BFA]/40 group-hover:shadow-[#A78BFA]/20'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-all duration-300 ${isCompleted
                        ? 'text-[#FFDD44]'
                        : isActive
                          ? 'text-[#101585] drop-shadow-[0_0_12px_rgba(16,21,133,0.55)]'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-[#101585]'
                      }`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold tracking-wide whitespace-nowrap hidden sm:inline ${isCompleted
                      ? 'text-[#101585] dark:text-[#A78BFA]'
                      : isActive
                        ? 'text-[#101585] dark:text-[#FFDD44]'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${currentStep > step.number
                        ? 'bg-gradient-to-r from-[#101585] via-[#A78BFA] to-[#101585]'
                        : isActive
                          ? 'bg-gradient-to-r from-[#101585]/35 via-[#FFDD44]/25 to-[#101585]/35 animate-pulse'
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
