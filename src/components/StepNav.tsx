export type WorkflowStep = "import" | "review" | "handoff";

const steps: Array<{ key: WorkflowStep; label: string }> = [
  { key: "import", label: "Importieren" },
  { key: "review", label: "Prüfen" },
  { key: "handoff", label: "Übergeben" },
];

export function StepNav({ current }: { current: WorkflowStep }) {
  const currentIndex = steps.findIndex((step) => step.key === current);
  return (
    <ol className="step-nav" aria-label="Arbeitsschritte">
      {steps.map((step, index) => (
        <li className={index <= currentIndex ? "active" : ""} key={step.key} aria-current={step.key === current ? "step" : undefined}>
          <span>{index + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
