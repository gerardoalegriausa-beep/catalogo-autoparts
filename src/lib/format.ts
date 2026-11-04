const usdFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
});

/** "USD 1,234.50" */
export function formatUsd(value: number): string {
  return usdFormatter.format(value).replace(/ /g, " ");
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

// Una fecha sin hora ("2026-11-15") se interpreta como mediodía en Lima, para
// que no retroceda un día al mostrarla.
const toDate = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00-05:00` : iso);

export const formatDate = (iso: string) => dateFormatter.format(toDate(iso));
export const formatDateTime = (iso: string) => dateTimeFormatter.format(toDate(iso));

/** Teléfono peruano a formato internacional para wa.me ("987654321" → "51987654321"). */
export function toWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
  return digits;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${toWhatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
}

const limaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });

/** Día calendario en Lima (YYYY-MM-DD) de un instante ISO. */
export const limaDate = (iso: string) => limaDay.format(new Date(iso));
