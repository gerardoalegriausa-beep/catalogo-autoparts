import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { PartCard } from "@/components/part-card";
import { Finder } from "@/components/finder";
import { VehiclePicker } from "@/components/vehicle-picker";
import { getParts, getVehicleYears } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/catalog-labels";
import { getStageDays } from "@/lib/config";
import { totalLeadDays } from "@/lib/eta";

const STEPS = [
  { title: "Pides con el VIN", text: "El sistema lee el VIN y te avisa al instante si la pieza no corresponde a tu vehículo." },
  { title: "Validamos el número de parte", text: "Una persona revisa el VIN en el catálogo original antes de comprar." },
  { title: "Compramos en EE. UU.", text: "Revisamos el número de parte en Miami antes de que salga del almacén." },
  { title: "Llega a tu taller", text: "Ves el avance del pedido en todo momento, con fecha estimada de entrega." },
];

export default async function Home() {
  const parts = await getParts();
  const featured = parts.slice(0, 6);
  const leadDays = totalLeadDays(getStageDays());
  const years = await getVehicleYears();

  return (
    <>
      <section className="bg-brand text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Para talleres en Perú</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              Repuestos Volvo desde Estados Unidos, validados con el VIN de tu cliente.
            </h1>
            <p className="mt-4 max-w-xl text-white/80">
              Sensores, bombas de agua, frenos y faros LED para XC40, XC60, XC90, S60 y S90. Precio final en dólares, con
              flete, aranceles e IGV incluidos, y entrega en tu taller en unos {leadDays} días.
            </p>
          </div>
          <Finder vehiclePicker={<VehiclePicker years={years} />} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold">O explora por categoría</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.id}`}
              className="card flex gap-3 p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-paper text-brand">
                <CategoryIcon category={c.id} />
              </span>
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="text-sm text-ink-soft">{c.description}</span>
              </span>
            </Link>
          ))}
        </div>

        {featured.length > 0 && (
          <>
            <div className="mt-12 flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Repuestos</h2>
              <Link href="/catalogo" className="text-sm font-semibold text-accent">
                Ver todo el catálogo →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <PartCard key={p.id} part={p} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-bold">Cómo evitamos devoluciones</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
