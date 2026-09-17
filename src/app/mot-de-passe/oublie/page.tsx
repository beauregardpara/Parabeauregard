import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
