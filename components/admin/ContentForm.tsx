"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { saveContentAction } from "@/lib/actions/admin/site";
import { CONTENT_GROUPS, parseClosedWeekdays, type SiteContent } from "@/lib/site";
import { WEEKDAYS } from "@/lib/utils";

export default function ContentForm({ initial }: { initial: SiteContent }) {
  const [values, setValues] = useState<SiteContent>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleWeekday(n: number) {
    const current = parseClosedWeekdays(values.closed_weekdays);
    const next = current.includes(n) ? current.filter((d) => d !== n) : [...current, n].sort();
    set("closed_weekdays", JSON.stringify(next.map(String)));
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveContentAction(values);
      setFeedback(res.ok ? { ok: true, text: "Website content updated ✓" } : { ok: false, text: res.error });
    });
  }

  const closedDays = parseClosedWeekdays(values.closed_weekdays);

  return (
    <div className="space-y-6">
      {CONTENT_GROUPS.map((group) => (
        <section key={group.title} className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">{group.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((f) => {
              const value = values[f.key] ?? "";
              if (f.type === "weekdays") {
                return (
                  <div key={f.key} className="sm:col-span-2">
                    <span className="admin-label">{f.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d.n}
                          type="button"
                          onClick={() => toggleWeekday(d.n)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                            closedDays.includes(d.n)
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Highlighted days are closed — the booking form hides them automatically.
                    </p>
                  </div>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.key} className="sm:col-span-2">
                    <label className="admin-label">{f.label}</label>
                    <textarea
                      value={value}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="input min-h-24"
                    />
                  </div>
                );
              }
              return (
                <div key={f.key}>
                  <label className="admin-label">{f.label}</label>
                  <input
                    type={f.type === "time" ? "time" : f.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="input"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-lg">
        <p className="text-xs text-ink-500">
          Changes apply to the storefront immediately after saving.
        </p>
        <button onClick={save} disabled={pending} className="btn btn-primary btn-sm">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
      </div>
      {feedback && (
        <p className={`text-xs font-medium ${feedback.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}
