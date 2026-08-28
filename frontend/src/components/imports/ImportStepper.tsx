"use client";

import { cn } from "@/lib/cn";

export type ImportStepId =
  | "upload"
  | "parse"
  | "classify"
  | "dedupe"
  | "ready";

const STEPS: { id: ImportStepId; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "parse", label: "Parse" },
  { id: "classify", label: "Classify" },
  { id: "dedupe", label: "Deduplicate" },
  { id: "ready", label: "Ready" },
];

interface ImportStepperProps {
  activeStep: ImportStepId;
  className?: string;
}

function stepIndex(id: ImportStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/**
 * Real-state import pipeline stepper inspired by React Bits Stepper.
 * @see docs/react-bits.md
 */
export function ImportStepper({ activeStep, className }: ImportStepperProps) {
  const activeIdx = stepIndex(activeStep);

  return (
    <ol className={cn("import-stepper list-none m-0 p-0 flex flex-wrap gap-2", className)} aria-label="Import progress">
      {STEPS.map((step, index) => {
        const done = index < activeIdx;
        const active = index === activeIdx;
        return (
          <li
            key={step.id}
            className={cn(
              "import-step",
              done && "done",
              active && "active",
            )}
            aria-current={active ? "step" : undefined}
          >
            <span className="import-step-num">{index + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
