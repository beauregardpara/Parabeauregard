import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
