import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-ink-soft">Puede que la pieza ya no esté disponible o que el enlace esté incompleto.</p>
      <Link href="/catalogo" className="btn-primary mt-6">
        Ir al catálogo
      </Link>
    </div>
  );
}
