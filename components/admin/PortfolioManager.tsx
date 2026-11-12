"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import {
  createPortfolioItemAction,
  deletePortfolioItemAction,
  updatePortfolioItemAction,
} from "@/lib/actions/admin/catalog";
import type { PortfolioItem } from "@/lib/types";

export default function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Bridal");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    const supabase = getBrowserClient();
    if (!supabase) {
      setError("Storage isn't configured.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);

      const res = await createPortfolioItemAction({
        title: newTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        category: newCategory.trim() || "Bridal",
        image_url: data.publicUrl,
      });
      if (!res.ok) setError(res.error);
      else {
        setNewTitle("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function patch(id: string, body: Parameters<typeof updatePortfolioItemAction>[1], msg: string) {
    setError(null);
    startTransition(async () => {
      const res = await updatePortfolioItemAction(id, body);
      if (!res.ok) setError(res.error);
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this photo?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePortfolioItemAction(id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <div className="card mb-6 p-5">
        <h3 className="text-sm font-semibold text-ink-900">Add photos</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          Uploads go to the studio&apos;s media bucket. Tip: use the same URL for service images.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title, e.g. Bridal look — Reception"
            className="input"
          />
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category"
            className="input"
          />
          <label className="btn btn-primary btn-sm cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {uploading ? "Uploading…" : "Choose file"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </label>
        </div>
        {error && <p className="field-error mt-2">{error}</p>}
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          No photos yet — upload your first look above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className={`card overflow-hidden ${pending ? "opacity-60" : ""}`}>
              <div className="relative aspect-[4/5] bg-ink-50">
                <Image src={item.image_url} alt={item.title} fill sizes="300px" className="object-cover" />
                <span className={`absolute right-2 top-2 badge ${item.is_published ? "bg-emerald-100 text-emerald-800" : "bg-black/60 text-white"}`}>
                  {item.is_published ? "Published" : "Hidden"}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <input
                  defaultValue={item.title}
                  onBlur={(e) =>
                    e.target.value !== item.title &&
                    patch(item.id, { title: e.target.value }, "saved")
                  }
                  className="input py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    defaultValue={item.category}
                    onBlur={(e) =>
                      e.target.value !== item.category &&
                      patch(item.id, { category: e.target.value }, "saved")
                    }
                    className="input py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    defaultValue={item.display_order}
                    onBlur={(e) =>
                      Number(e.target.value) !== item.display_order &&
                      patch(item.id, { display_order: Number(e.target.value) }, "saved")
                    }
                    title="Display order"
                    className="input w-16 py-1.5 text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-ink-600">
                    <input
                      type="checkbox"
                      defaultChecked={item.is_published}
                      onChange={(e) => patch(item.id, { is_published: e.target.checked }, "saved")}
                      className="h-4 w-4"
                    />
                    Show on website
                  </label>
                  <button
                    onClick={() => remove(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-200 text-rose-600 hover:border-rose-300"
                    aria-label="Delete photo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
