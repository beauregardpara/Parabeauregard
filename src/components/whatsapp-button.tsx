import Link from "next/link";
import { whatsappLink } from "@/lib/constants";

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2 1.38-.51.05-1.16.07-1.87-.12-.43-.12-1-.27-1.71-.53-2.95-1.28-4.87-4.26-5.02-4.45-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.59.85 2.05.92 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.2.72-.84.91-1.13.19-.29.38-.24.64-.14.26.1 1.65.78 1.94.92.28.14.47.21.54.32.07.11.07.65-.18 1.34z" />
    </svg>
  );
}

export function WhatsAppButton({
  productName,
  className = "inline-flex items-center gap-2 rounded-full border border-para-200 bg-white px-5 py-2.5 text-sm font-semibold text-para-800 transition hover:bg-green-50",
}: {
  productName?: string;
  className?: string;
}) {
  const message = productName
    ? `Bonjour, j'aimerais avoir plus d'informations sur « ${productName} ».`
    : "Bonjour Para Beauregard, je souhaite avoir des informations concernant ";
  return (
    <Link href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className={className} aria-label="Nous contacter sur WhatsApp">
      <WhatsAppIcon className="h-4 w-4 text-green-600" />
      Aide sur WhatsApp
    </Link>
  );
}
