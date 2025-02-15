import { Check } from "lucide-react";

const steps = ["1", "2", "3", "4", "5"];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="relative flex items-center justify-between w-full">
      {/* Progress bar background */}
      <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200" />

      {/* Active progress bar */}
      <div 
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      {steps.map((step, index) => (
        <div key={step} className="relative z-10">
          <div
            className={`
              w-12 h-12 flex items-center justify-center rounded-full 
              transition-all duration-300 border-2
              ${
                index < currentStep
                  ? "bg-gradient-to-r from-blue-600 to-blue-400 border-transparent shadow-lg"
                  : index === currentStep
                  ? "bg-white border-blue-600 text-blue-600 shadow-lg"
                  : "bg-white border-gray-300 text-gray-400"
              }
            `}
          >
            {index < currentStep ? (
              <Check className="w-6 h-6 text-white" />
            ) : (
              <span className="text-lg font-semibold">{step}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}