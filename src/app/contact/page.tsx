import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContentPage } from "@/components/content-page";
import { ContactForm } from "@/components/contact-form";
import { BUSINESS, BUSINESS_MAPS_URL } from "@/config/business";
import { whatsappLink } from "@/lib/constants";
import { getBusinessPolicies } from "@/config/legal";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  const { openingHours } = getBusinessPolicies();
  const subtitle = openingHours
    ? `Notre équipe vous répond ${openingHours}.`
    : "Notre équipe vous répond par téléphone, WhatsApp ou email.";
  return (
    <ContentPage title="Contactez-nous" subtitle={subtitle}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-para-100 bg-white p-5 text-center shadow-sm">
          <Phone className="mx-auto text-para-700" size={25} strokeWidth={1.6} aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Téléphone</p>
          <a href={`tel:${BUSINESS.phoneInternational}`} className="font-semibold text-para-800 hover:text-para-600">{BUSINESS.phoneDisplay}</a>
        </div>
        <div className="rounded-2xl border border-para-100 bg-white p-5 text-center shadow-sm">
          <Mail className="mx-auto text-para-700" size={25} strokeWidth={1.6} aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Email</p>
          <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-para-800 hover:text-para-600">{BUSINESS.email}</a>
        </div>
        <div className="rounded-2xl border border-para-100 bg-white p-5 text-center shadow-sm">
          <MapPin className="mx-auto text-para-700" size={25} strokeWidth={1.6} aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Localisation</p>
          <p className="font-semibold text-para-800">{BUSINESS.locationLabel}</p>
          <a href={BUSINESS_MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-para-700 underline">Voir l'itinéraire</a>
        </div>
      </div>

      <h2>Formulaire de contact</h2>
      <ContactForm />

      <h2>Service client WhatsApp</h2>
      <p>
        Pour une réponse rapide, écrivez-nous sur{" "}
        <Link
          href={whatsappLink("Bonjour Para Beauregard, je souhaite avoir des informations concernant ")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-para-700 underline"
        >
          WhatsApp ({BUSINESS.phoneDisplay})
        </Link>
        .
      </p>
    </ContentPage>
  );
}
