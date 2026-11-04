import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { storeName } from "@/lib/config";
import { isDemoMode } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${storeName} · Repuestos Volvo para talleres`, template: `%s · ${storeName}` },
  description:
    "Repuestos Volvo importados desde Estados Unidos para talleres en Perú. Validación por VIN antes de comprar y seguimiento del pedido hasta tu taller.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {isDemoMode && (
          <div className="bg-warn-soft px-4 py-2 text-center text-xs text-warn">
            Modo demostración: las piezas y precios son ejemplos y los pedidos no se guardan.
          </div>
        )}
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-brand">{storeName}</span>
              <span className="hidden text-sm text-ink-soft sm:inline">Repuestos Volvo para talleres</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link href="/catalogo" className="rounded-lg px-3 py-2 hover:bg-paper">
                Catálogo
              </Link>
              <Link href="/vin" className="rounded-lg px-3 py-2 hover:bg-paper">
                Buscar por VIN
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-ink-soft">
            <p>
              Importación directa desde Estados Unidos, con validación por VIN y entrega en tu taller. Precios en dólares
              con flete, aranceles e IGV incluidos.
            </p>
            <p>Tienda independiente, sin relación con Volvo Car Corporation. Volvo y los nombres de modelos son marcas de sus dueños.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
