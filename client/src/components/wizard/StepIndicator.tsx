import { Check, ArrowRight } from "lucide-react";

const steps = [
  "Company Info",
  "Upload Document",
  "Q&A Management",
  "Appearance",
  "Get Embed Code"
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="relative">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full border-2 
                ${
                  index < currentStep
                    ? "bg-blue-600 border-blue-600 text-white"
                    : index === currentStep
                    ? "border-blue-600 text-blue-600"
                    : "border-gray-300 text-gray-300"
                }`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span
              className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm
                ${
                  index <= currentStep
                    ? "text-blue-600 font-medium"
                    : "text-gray-400"
                }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-full h-0.5 mx-4 
                ${
                  index < currentStep
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
            >
              <ArrowRight
                className={`w-4 h-4 -mt-1.5 ml-auto 
                  ${
                    index < currentStep
                      ? "text-blue-600"
                      : "text-gray-300"
                  }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
