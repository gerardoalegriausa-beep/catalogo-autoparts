// Genera data/repuestos-ejemplo.csv a partir del catálogo de demostración.
//   npm run export-demo-csv
import { writeFileSync } from "node:fs";
import { DEMO_PARTS } from "../src/data/demo-catalog.ts";
import { partsToCsv } from "../src/lib/parts-csv.ts";

writeFileSync(new URL("../data/repuestos-ejemplo.csv", import.meta.url), partsToCsv(DEMO_PARTS));
console.log(`data/repuestos-ejemplo.csv: ${DEMO_PARTS.length} repuestos`);
