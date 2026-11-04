import type { CategoryId } from "@/lib/types";

// Íconos simples en SVG (sin dependencias) para cada categoría.
export function CategoryIcon({ category, className = "size-6" }: { category: CategoryId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (category) {
    case "sensores-electronica":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
        </svg>
      );
    case "motor-refrigeracion":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      );
    case "frenos":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M16.5 4.5a9 9 0 0 1 3 4" />
        </svg>
      );
    case "iluminacion":
      return (
        <svg {...common}>
          <path d="M10 5h3a7 7 0 0 1 0 14h-3z" />
          <path d="M2 8h5M2 12h5M2 16h5" />
        </svg>
      );
  }
}
