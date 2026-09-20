"use client";

import { cn } from "@/helpers/cn";

export type SetupStepId = "gmail" | "pool" | "upload" | "ready";

const STEPS: { id: SetupStepId; label: string }[] = [
  { id: "gmail", label: "Gmail" },
  { id: "pool", label: "Bank mail" },
  { id: "upload", label: "PDF upload" },
  { id: "ready", label: "Ready" },
];

interface ImportStepperProps {
  activeStep: SetupStepId;
  className?: string;
}

function stepIndex(id: SetupStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/**
 * Setup progress for first-run Import — Gmail → pooling → PDF → ready.
 */
export function ImportStepper({ activeStep, className }: ImportStepperProps) {
  const activeIdx = stepIndex(activeStep);

  return (
    <ol
      className={cn(
        "import-stepper list-none m-0 p-0 flex flex-wrap gap-2",
        className,
      )}
      aria-label="Setup progress"
    >
      {STEPS.map((step, index) => {
        const done = index < activeIdx;
        const active = index === activeIdx;
        return (
          <li
            key={step.id}
            className={cn("import-step", done && "done", active && "active")}
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
