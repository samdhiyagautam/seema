"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Inbox,
  Users,
  GraduationCap,
  BookUser,
  UsersRound,
  Sparkles,
  Image as ImageIcon,
  Star,
  FileText,
  CalendarOff,
  Wallet,
  BellRing,
  TrendingUp,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { can, ROLE_LABELS, type Capability } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { cx } from "@/lib/utils";

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; cap: Capability }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, cap: "bookings.view" },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange, cap: "bookings.view" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, cap: "bookings.view" },
  { href: "/admin/reminders", label: "Reminders", icon: BellRing, cap: "bookings.view" },
  { href: "/admin/leads", label: "Leads", icon: Inbox, cap: "leads.view" },
  { href: "/admin/customers", label: "Customers", icon: Users, cap: "customers.view" },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap, cap: "courses.manage" },
  { href: "/admin/students", label: "Students & fees", icon: BookUser, cap: "courses.manage" },
  { href: "/admin/staff", label: "Staff", icon: UsersRound, cap: "bookings.manage" },
  { href: "/admin/services", label: "Services", icon: Sparkles, cap: "catalog.manage" },
  { href: "/admin/portfolio", label: "Portfolio", icon: ImageIcon, cap: "portfolio.manage" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, cap: "reviews.moderate" },
  { href: "/admin/content", label: "Site content", icon: FileText, cap: "content.manage" },
  { href: "/admin/availability", label: "Availability", icon: CalendarOff, cap: "content.manage" },
  { href: "/admin/finance", label: "Finance", icon: Wallet, cap: "finance.view" },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp, cap: "analytics.view" },
  { href: "/admin/users", label: "Users & roles", icon: ShieldCheck, cap: "users.manage" },
];

export default function Sidebar({ role, email }: { role: Role; email: string }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => can(role, n.cap));

  const link = (n: (typeof NAV)[number], compact = false) => (
    <Link
      key={n.href}
      href={n.href}
      className={cx(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        compact ? "shrink-0" : "",
        pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))
          ? "bg-brand-600 text-white"
          : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      <n.icon size={16} />
      {n.label}
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-100 bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-semibold text-white">
            S
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">Studio Admin</p>
            <p className="text-[11px] text-ink-400">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items.map((n) => link(n))}</nav>

        <div className="border-t border-ink-100 p-3">
          <p className="truncate px-3 pb-1 text-[11px] text-ink-400">{email}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="sticky top-0 z-30 border-b border-ink-100 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-display text-xs font-semibold text-white">
              S
            </span>
            <p className="text-sm font-semibold text-ink-900">Studio Admin</p>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="flex items-center gap-1 text-xs font-medium text-ink-500">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">{items.map((n) => link(n, true))}</nav>
      </div>
    </>
  );
}
