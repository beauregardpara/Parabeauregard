import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";
import { MessageCircle } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function AdminChatPage() {
  await requireAdminPagePermission("chat:read");
  const sessions = await db.chatSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 30,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const totalMessages = sessions.reduce((s, sess) => s + sess.messages.length, 0);

  return (
    <>
      <PageHeader
        title="Assistant IA — conversations"
        subtitle={`${sessions.length} session(s) · ${totalMessages} message(s). Analysez les besoins non couverts par le catalogue.`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sessions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400 lg:col-span-2">
            Aucune conversation enregistrée pour le moment.
          </p>
        )}
        {sessions.map((s) => {
          const userMsgs = s.messages.filter((m) => m.role === "user");
          return (
            <details key={s.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-mint/30">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-para-50 text-para-700"><MessageCircle size={17} strokeWidth={1.7} aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{userMsgs[0]?.content ?? "(session vide)"}</strong>
                  <span className="text-xs text-slate-400">{formatDate(s.startedAt)} · {s.messages.length} messages</span>
                </span>
              </summary>
              <div className="max-h-96 space-y-2 overflow-y-auto border-t border-slate-50 bg-mint/30 p-4">
                {s.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "user" ? "rounded-br-sm bg-gradient-to-br from-para-600 to-para-500 text-white" : "rounded-bl-sm bg-white shadow-sm"
                    }`}>
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
