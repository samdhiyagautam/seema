"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { createBookingAction } from "@/lib/actions/public";
import { track } from "@/lib/analytics";
import WhatsAppLink from "@/components/site/WhatsAppLink";
import { cx, formatDay, formatINR, formatTime, minutesToTime, timeToMinutes, waLink } from "@/lib/utils";
import type { SlotsConfig } from "@/lib/site";

type ServiceLite = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price_inr: number;
  duration_minutes: number;
};

type Props = {
  services: ServiceLite[];
  config: SlotsConfig;
  initialSlug?: string;
  initialCategory?: string;
};

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function slotsForDate(date: string, service: ServiceLite | undefined, cfg: SlotsConfig): string[] {
  if (!date || !service) return [];
  const weekday = new Date(`${date}T00:00:00`).getDay(); // 0=Sun
  const isoDay = weekday === 0 ? 7 : weekday;
  if (cfg.closedWeekdays.includes(isoDay)) return [];
  if (cfg.blockedDates.includes(date)) return [];

  const start = timeToMinutes(cfg.open);
  const end = timeToMinutes(cfg.close);
  const dur = service.duration_minutes;

  const now = new Date();
  const isToday = date === todayISO();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoff = nowMinutes + cfg.noticeHours * 60;

  const out: string[] = [];
  for (let t = start; t + dur <= end; t += cfg.interval) {
    if (isToday && t < cutoff) continue;
    out.push(minutesToTime(t));
  }
  return out;
}

function buildIcs(code: string, service: string, date: string, time: string, studio: string) {
  const dt = date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
  const endMinutes = timeToMinutes(time) + 120;
  const dtEnd =
    date.replace(/-/g, "") +
    "T" +
    String(Math.floor(endMinutes / 60) % 24).padStart(2, "0") +
    String(endMinutes % 60).padStart(2, "0") +
    "00";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seema Makeover Studio//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${code}@seemamakeover`,
    `DTSTART;TZID=Asia/Kolkata:${dt}`,
    `DTEND;TZID=Asia/Kolkata:${dtEnd}`,
    `SUMMARY:${service} @ ${studio}`,
    `DESCRIPTION:Booking code ${code}. Please arrive 10 minutes early.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export default function BookingForm({ services, config, initialSlug, initialCategory }: Props) {
  const initial = initialSlug ? services.find((s) => s.slug === initialSlug) : undefined;
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
    initial ? undefined : initialCategory
  );
  const filtered =
    categoryFilter && services.some((s) => s.category === categoryFilter)
      ? services.filter((s) => s.category === categoryFilter)
      : services;
  const [service, setService] = useState<ServiceLite | undefined>(initial);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(initial ? 2 : 1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const slots = useMemo(
    () => (service ? slotsForDate(date, service, config) : []),
    [service, date, config]
  );

  function pickService(s: ServiceLite) {
    setService(s);
    setSlot("");
    setError(null);
    setStep(2);
    track("booking_started", { service: s.slug });
  }

  function pickDate(d: string) {
    setDate(d);
    setSlot("");
    setError(null);
  }

  function nextToDetails() {
    if (!service || !date || !slot) {
      setError("Please pick a date and time slot first.");
      return;
    }
    setError(null);
    setStep(3);
  }

  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const phoneRaw = String(formData.get("phone") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const phone = phoneRaw.replace(/[\s-]/g, "").replace(/^\+?91/, "");
    if (name.length < 2) return setError("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");

    if (!service || !date || !slot) return setError("Please pick a service, date and slot.");

    setError(null);
    startTransition(async () => {
      const res = await createBookingAction({
        name,
        phone,
        email,
        serviceId: service.id,
        date,
        time: slot,
        notes,
      });
      if (res.ok && res.data) {
        setResult({ code: res.data.code });
      } else {
        setError(res.ok ? "Something went wrong." : res.error);
        if (res.ok === false && res.error.toLowerCase().includes("slot")) {
          setStep(2);
        }
      }
    });
  }

  /* -------------------------------------------------------- confirmation */
  if (result && service) {
    const waText = `Hi ${config.studioName}! I just booked ${service.name} on ${formatDay(
      date
    )} at ${formatTime(slot)}. My booking code is ${result.code}.`;
    const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(
      buildIcs(result.code, service.name, date, slot, config.studioName)
    )}`;

    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">Booking received!</h2>
        <p className="mt-1 text-sm text-ink-500">
          We&apos;ll confirm your slot on WhatsApp shortly.
        </p>

        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Booking code</p>
          <button
            type="button"
            className="mt-1 flex items-center justify-center gap-2 font-mono text-xl font-bold text-brand-800"
            onClick={() => {
              void navigator.clipboard?.writeText(result.code);
              setCopied(true);
            }}
          >
            {result.code} <Copy size={15} className="text-brand-500" />
          </button>
          {copied && <p className="mt-1 text-xs text-emerald-700">Copied!</p>}
        </div>

        <dl className="mt-6 space-y-2 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Service</dt>
            <dd className="font-medium text-ink-900">{service.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">When</dt>
            <dd className="font-medium text-ink-900">
              {formatDay(date)}, {formatTime(slot)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500">Price</dt>
            <dd className="font-medium text-ink-900">{formatINR(service.price_inr)}</dd>
          </div>
        </dl>

        {config.upiId && config.advanceNote ? (
          <div className="mt-4 rounded-lg bg-ink-50 p-3 text-left text-xs text-ink-600">
            {config.advanceNote} UPI ID: <span className="font-mono font-semibold">{config.upiId}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <WhatsAppLink href={waLink(config.whatsapp, waText)} label="booking-confirmation" className="btn btn-primary justify-center">
            <MessageCircle size={16} /> Send details on WhatsApp
          </WhatsAppLink>
          <a href={icsHref} download={`${result.code}.ics`} className="btn btn-outline justify-center">
            <Download size={15} /> Add to calendar
          </a>
          <Link href="/" className="btn btn-ghost justify-center text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------- stepper */
  const stepLabels = ["Service", "Date & time", "Your details"];

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-medium">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = step > n;
          const active = step === n;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cx(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px]",
                  active && "border-brand-600 bg-brand-600 text-white",
                  done && "border-brand-300 bg-brand-100 text-brand-700",
                  !active && !done && "border-ink-200 bg-white text-ink-400"
                )}
              >
                {done ? <CheckCircle2 size={14} /> : n}
              </span>
              <span className={cx("hidden sm:inline", active ? "text-ink-900" : "text-ink-400")}>{label}</span>
              {i < 2 && <span className="mx-1 h-px w-6 bg-ink-200" />}
            </li>
          );
        })}
      </ol>

      {/* Step 1 — service */}
      {step === 1 && (
        <div className="space-y-3">
          {categoryFilter && (
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-2.5 text-sm">
              <span className="text-brand-800">
                Showing <strong>{categoryFilter}</strong> services
              </span>
              <button
                onClick={() => setCategoryFilter(undefined)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Show all services
              </button>
            </div>
          )}
          {(categoryFilter ? filtered : services).length === 0 ? (
            <p className="card p-8 text-center text-sm text-ink-500">
              No services are open for booking right now — please WhatsApp us instead.
            </p>
          ) : (
            (categoryFilter ? filtered : services).map((s) => (
              <button
                key={s.id}
                onClick={() => pickService(s)}
                className="card flex w-full items-center justify-between gap-4 p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
              >
                <span>
                  <span className="block font-semibold text-ink-900">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-xs text-ink-500">
                    <span className="badge bg-brand-50 text-brand-700">{s.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {s.duration_minutes} min
                    </span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold text-brand-700">{formatINR(s.price_inr)}</span>
                  <ArrowRight size={15} className="ml-auto mt-1 text-ink-400" />
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Step 2 — date & slot */}
      {step === 2 && (
        <div className="card space-y-5 p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink-900">
              {service?.name} <span className="text-xs font-normal text-ink-500">({service?.duration_minutes} min)</span>
            </p>
            <button onClick={() => setStep(1)} className="text-xs font-medium text-brand-700 hover:underline">
              Change
            </button>
          </div>

          <div>
            <label className="label" htmlFor="bk-date">Pick a date</label>
            <input
              id="bk-date"
              type="date"
              className="input"
              min={todayISO()}
              value={date}
              onChange={(e) => pickDate(e.target.value)}
            />
          </div>

          {date && (
            <div>
              <span className="label">Available slots</span>
              {slots.length === 0 ? (
                <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500">
                  {formatDay(date)} is fully booked or the studio is closed. Please pick another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSlot(t)}
                      className={cx(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition",
                        slot === t
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
                      )}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="field-error">{error}</p>}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={nextToDetails}
              disabled={!date || !slot}
              className="btn btn-primary btn-sm"
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — details */}
      {step === 3 && service && (
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
        >
          <div className="rounded-lg bg-brand-50 p-3 text-sm">
            <span className="font-semibold text-ink-900">{service.name}</span>
            <span className="text-ink-500"> · </span>
            <span className="text-ink-600">
              <CalendarDays size={13} className="inline" /> {formatDay(date)}, {formatTime(slot)}
            </span>
            <button type="button" onClick={() => setStep(2)} className="ml-2 text-xs font-medium text-brand-700 hover:underline">
              Change
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="bk-name">Full name *</label>
              <input id="bk-name" name="name" className="input" required maxLength={80} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="bk-phone">Mobile (WhatsApp) *</label>
              <input
                id="bk-phone"
                name="phone"
                className="input"
                inputMode="tel"
                placeholder="10-digit mobile"
                required
                autoComplete="tel"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bk-email">Email (optional)</label>
            <input id="bk-email" name="email" type="email" className="input" autoComplete="email" />
          </div>

          <div>
            <label className="label" htmlFor="bk-notes">Anything we should know? (optional)</label>
            <textarea
              id="bk-notes"
              name="notes"
              className="input min-h-20"
              maxLength={1000}
              placeholder="Occasion, address if it's a home service, preferred look…"
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost btn-sm" disabled={pending}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              {pending ? "Confirming…" : "Confirm booking"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
