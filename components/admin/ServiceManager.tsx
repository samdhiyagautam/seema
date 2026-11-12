"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteServiceAction, upsertServiceAction } from "@/lib/actions/admin/catalog";
import { formatINR } from "@/lib/utils";
import type { Service } from "@/lib/types";

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  category: "Makeup",
  description: "",
  duration_minutes: 60,
  price_inr: 1000,
  image_url: "",
  is_active: true,
  display_order: 0,
};

export default function ServiceManager({ services }: { services: Service[] }) {
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await upsertServiceAction({
        id: form.id,
        name: String(fd.get("name") ?? ""),
        category: String(fd.get("category") ?? ""),
        description: String(fd.get("description") ?? ""),
        duration_minutes: Number(fd.get("duration_minutes") ?? 60),
        price_inr: Number(fd.get("price_inr") ?? 0),
        image_url: String(fd.get("image_url") ?? ""),
        is_active: fd.get("is_active") === "on",
        display_order: Number(fd.get("display_order") ?? 0),
      });
      if (res.ok) {
        setForm(null);
        setFeedback("Service saved ✓");
      } else setError(res.error);
    });
  }

  function remove(s: Service) {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteServiceAction(s.id);
      setError(res.ok ? null : res.error);
      if (res.ok) setFeedback("Deleted ✓");
    });
  }

  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setForm({ ...EMPTY })} className="btn btn-primary btn-sm">
          <Plus size={14} /> New service
        </button>
        {feedback && !error && <p className="text-xs text-emerald-700">{feedback}</p>}
      </div>

      {form && (
        <form onSubmit={save} className="card mb-5 grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">{form.id ? "Edit service" : "New service"}</h3>
            <button type="button" onClick={() => setForm(null)} className="text-ink-400 hover:text-ink-700">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="admin-label">Name *</label>
            <input name="name" defaultValue={form.name} className="input" required />
          </div>
          <div>
            <label className="admin-label">Category</label>
            <input
              name="category"
              defaultValue={form.category}
              className="input"
              list="svc-categories"
            />
            <datalist id="svc-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
              <option value="Bridal" />
              <option value="Occasion" />
              <option value="Add-on" />
            </datalist>
          </div>
          <div>
            <label className="admin-label">Price (₹) *</label>
            <input name="price_inr" type="number" min={0} defaultValue={form.price_inr} className="input" required />
          </div>
          <div>
            <label className="admin-label">Duration (minutes) *</label>
            <input
              name="duration_minutes"
              type="number"
              min={15}
              max={720}
              step={15}
              defaultValue={form.duration_minutes}
              className="input"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Description</label>
            <textarea name="description" defaultValue={form.description} className="input min-h-20" />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Image URL (optional — upload in Portfolio, reuse URL)</label>
            <input name="image_url" defaultValue={form.image_url} className="input" placeholder="https://…supabase.co/…jpg" />
          </div>
          <div>
            <label className="admin-label">Display order</label>
            <input name="display_order" type="number" defaultValue={form.display_order} className="input" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-ink-700">
            <input type="checkbox" name="is_active" defaultChecked={form.is_active} className="h-4 w-4" />
            Active (visible on website)
          </label>
          {error && <p className="field-error sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save service
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] divide-y divide-ink-100">
          <thead className="bg-ink-50/70">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Service</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Category</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Price</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Duration</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Live</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {services.map((s) => (
              <tr key={s.id} className={pending ? "opacity-60" : ""}>
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium text-ink-900">{s.name}</p>
                  <p className="text-[11px] text-ink-400">/{s.slug}</p>
                </td>
                <td className="px-4 py-3 text-sm">{s.category}</td>
                <td className="px-4 py-3 text-sm font-medium text-brand-700">{formatINR(s.price_inr)}</td>
                <td className="px-4 py-3 text-sm">{s.duration_minutes} min</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-ink-100 text-ink-500"}`}>
                    {s.is_active ? "Live" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() =>
                        setForm({
                          id: s.id,
                          name: s.name,
                          category: s.category,
                          description: s.description ?? "",
                          duration_minutes: s.duration_minutes,
                          price_inr: s.price_inr,
                          image_url: s.image_url ?? "",
                          is_active: s.is_active,
                          display_order: s.display_order,
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 hover:border-brand-300"
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-rose-600 hover:border-rose-300"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
