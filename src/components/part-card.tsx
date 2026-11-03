import Link from "next/link";
import { CATEGORY_NAMES, CONDITION_LABELS, MODEL_NAMES } from "@/lib/catalog-labels";
import { getPricingConfig } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { priceBreakdown } from "@/lib/pricing";
import type { Part } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

export function modelsSummary(part: Part): string {
  const ids = [...new Set(part.fitments.map((f) => f.modelId))];
  return ids.map((id) => MODEL_NAMES[id]).join(" · ");
}

export function PartCard({ part, query = "" }: { part: Part; query?: string }) {
  const price = priceBreakdown(part, getPricingConfig());
  return (
    <Link
      href={query ? `/repuesto/${part.slug}?${query}` : `/repuesto/${part.slug}`}
      className="card group flex flex-col gap-3 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-paper text-brand">
          <CategoryIcon category={part.categoryId} />
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {part.condition !== "nuevo" && (
            <span className="chip bg-warn-soft text-warn">{CONDITION_LABELS[part.condition]}</span>
          )}
          {part.highRisk && <span className="chip bg-paper text-ink-soft">Requiere N.º de parte</span>}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{CATEGORY_NAMES[part.categoryId]}</p>
        <h3 className="mt-1 font-semibold leading-snug group-hover:text-accent">{part.name}</h3>
        <p className="mt-1 text-sm text-ink-soft">
          {part.brand}
          {part.oemPartNumber ? ` · ${part.oemPartNumber}` : ""}
        </p>
        <p className="mt-2 text-xs text-ink-soft">{modelsSummary(part)}</p>
      </div>
      <div className="flex items-end justify-between border-t border-line pt-3">
        <div>
          <p className="text-lg font-bold">{formatUsd(price.totalUsd)}</p>
          <p className="text-xs text-ink-soft">Puesto en tu taller</p>
        </div>
        <span className="text-sm font-semibold text-accent">Ver →</span>
      </div>
    </Link>
  );
}
