import { STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/catalog-labels";
import type { TimelineStep } from "@/lib/eta";
import { formatDate } from "@/lib/format";
import type { OrderEvent } from "@/lib/types";

export function OrderTimeline({
  steps,
  events,
  cancelled,
}: {
  steps: TimelineStep[];
  events: OrderEvent[];
  cancelled: boolean;
}) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const note = events.findLast((e) => e.status === step.status)?.note;
        const last = i === steps.length - 1;
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${step.done && steps[i + 1].done ? "bg-ok" : "bg-line"}`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                step.done
                  ? "border-ok bg-ok text-white"
                  : cancelled
                    ? "border-line bg-paper text-ink-soft"
                    : "border-line bg-white text-ink-soft"
              } ${step.current ? "ring-4 ring-ok/20" : ""}`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={`font-semibold ${step.done ? "text-ink" : "text-ink-soft"}`}>{STATUS_LABELS[step.status]}</p>
                {!cancelled && (
                  <p className="text-xs text-ink-soft">
                    {step.estimated ? `Estimado: ${formatDate(step.date)}` : formatDate(step.date)}
                  </p>
                )}
              </div>
              {(step.current || (step.done && note)) && (
                <p className="mt-0.5 text-sm text-ink-soft">{note || STATUS_DESCRIPTIONS[step.status]}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
