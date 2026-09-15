import type { ReactNode } from "react";

export function ContentPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-para-950 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-slate-600">{subtitle}</p>}
        <hr className="hr-gradient mt-6 w-40" />
      </header>
      <div className="space-y-5 leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-para-900 [&_h3]:mt-6 [&_h3]:font-bold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_a]:text-para-700 [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
