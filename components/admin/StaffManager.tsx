"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Power, X } from "lucide-react";
import { deactivateStaffAction, upsertStaffAction } from "@/lib/actions/admin/site";
import type { StaffMember } from "@/lib/types";

const EMPTY = {
  id: undefined as string | undefined,
  full_name: "",
  role_title: "Artist",
  bio: "",
  specialties: "",
  phone: "",
  image_url: "",
  is_active: true,
  display_order: 0,
};

export default function StaffManager({ staff }: { staff: StaffMember[] }) {
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
      const res = await upsertStaffAction({
        id: form.id,
        full_name: String(fd.get("full_name") ?? ""),
        role_title: String(fd.get("role_title") ?? ""),
        bio: String(fd.get("bio") ?? ""),
        specialties: String(fd.get("specialties") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        image_url: String(fd.get("image_url") ?? ""),
        is_active: fd.get("is_active") === "on",
        display_order: Number(fd.get("display_order") ?? 0),
      });
      if (res.ok) {
        setForm(null);
        setFeedback("Saved ✓");
      } else setError(res.error);
    });
  }

  function toggle(s: StaffMember) {
    setError(null);
    startTransition(async () => {
      const res = await deactivateStaffAction(s.id, !s.is_active);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => setForm({ ...EMPTY })} className="btn btn-primary btn-sm">
          <Plus size={14} /> Add artist
        </button>
        {feedback && <p className="text-xs text-emerald-700">{feedback}</p>}
      </div>

      {form && (
        <form onSubmit={save} className="card mb-5 grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">{form.id ? "Edit artist" : "New artist"}</h3>
            <button type="button" onClick={() => setForm(null)} className="text-ink-400 hover:text-ink-700">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="admin-label">Name *</label>
            <input name="full_name" defaultValue={form.full_name} className="input" required />
          </div>
          <div>
            <label className="admin-label">Role title</label>
            <input name="role_title" defaultValue={form.role_title} className="input" />
          </div>
          <div>
            <label className="admin-label">Phone</label>
            <input name="phone" defaultValue={form.phone} className="input" />
          </div>
          <div>
            <label className="admin-label">Image URL</label>
            <input name="image_url" defaultValue={form.image_url} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Specialties (comma separated)</label>
            <input name="specialties" defaultValue={form.specialties} className="input" placeholder="Bridal HD, Hairstyling" />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Bio</label>
            <textarea name="bio" defaultValue={form.bio} className="input min-h-20" />
          </div>
          <div>
            <label className="admin-label">Display order</label>
            <input name="display_order" type="number" defaultValue={form.display_order} className="input" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-ink-700">
            <input type="checkbox" name="is_active" defaultChecked={form.is_active} className="h-4 w-4" />
            Active
          </label>
          {error && <p className="field-error sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save artist
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {staff.map((s) => (
          <div key={s.id} className={`card flex items-start justify-between gap-4 p-4 ${pending ? "opacity-60" : ""}`}>
            <div className="min-w-0">
              <p className="font-medium text-ink-900">{s.full_name}</p>
              <p className="text-xs text-ink-500">{s.role_title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.specialties.map((sp) => (
                  <span key={sp} className="badge bg-brand-50 text-brand-700">{sp}</span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">
                {s.is_active ? "Active — shown on the website" : "Inactive"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() =>
                  setForm({
                    id: s.id,
                    full_name: s.full_name,
                    role_title: s.role_title,
                    bio: s.bio ?? "",
                    specialties: s.specialties.join(", "),
                    phone: s.phone ?? "",
                    image_url: s.image_url ?? "",
                    is_active: s.is_active,
                    display_order: s.display_order,
                  })
                }
                className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:border-brand-300"
              >
                Edit
              </button>
              <button
                onClick={() => toggle(s)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:border-brand-300"
                aria-label={s.is_active ? "Deactivate" : "Activate"}
                title={s.is_active ? "Deactivate" : "Activate"}
              >
                <Power size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
