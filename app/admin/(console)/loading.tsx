import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-ink-400">
      <Loader2 size={16} className="animate-spin" /> Loading studio data…
    </div>
  );
}
