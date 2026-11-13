"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createExpenseAction, deleteExpenseAction } from "@/lib/actions/admin/finance";
import { EXPENSE_CATEGORIES, formatINR, formatDate, todayISO } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export default function ExpenseForm({ recent }: { recent: Expense[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [spentOn, setSpentOn] = useState(todayISO());
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await createExpenseAction({
        spent_on: spentOn,
        category,
        description,
        amount_inr: Number(amount),
      });
      if (res.ok) {
        setSaved(true);
        setAmount("");
        setDescription("");
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this expense entry?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteExpenseAction(id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form onSubmit={submit} className="card h-fit space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Add an expense</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Money that left the studio — products, rent, salaries, ads. Feeds the profit card.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exp-date">Date</label>
            <input
              id="exp-date"
              type="date"
              className="input"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="exp-amount">Amount (₹)</label>
            <input
              id="exp-amount"
              type="number"
              min={1}
              className="input"
              placeholder="e.g. 4500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="exp-category">Category</label>
          <select
            id="exp-category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="exp-desc">Note (optional)</label>
          <input
            id="exp-desc"
            className="input"
            maxLength={300}
            placeholder="e.g. Lakme kit restock"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p className="field-error">{error}</p>}
        {saved && <p className="text-xs font-medium text-emerald-600">Expense saved ✓</p>}

        <button type="submit" className="btn btn-primary btn-sm w-full justify-center" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {pending ? "Saving…" : "Save expense"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-ink-900">Recent expenses</h3>
          <span className="text-xs text-ink-400">Last 30 entries</span>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-500">
            No expenses recorded yet. Add your first one to see profit.
          </p>
        ) : (
          <table className="w-full min-w-[480px]">
            <thead className="bg-ink-50/70">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Date</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Category</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Note</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-400">Amount</th>
                <th className="px-2 py-2" aria-label="Delete" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {recent.map((x) => (
                <tr key={x.id} className={pending ? "opacity-60" : ""}>
                  <td className="px-4 py-2.5 text-sm text-ink-700">{formatDate(x.spent_on)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-ink-800">{x.category}</td>
                  <td className="max-w-40 truncate px-4 py-2.5 text-xs text-ink-500">{x.description ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-ink-900">{formatINR(x.amount_inr)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(x.id)}
                      className="text-ink-300 transition hover:text-rose-600"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
