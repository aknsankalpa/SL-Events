"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Search, X } from "lucide-react";
import { categories, citiesWithEvents, events, fromPrice, type CategoryId } from "@/lib/data";
import { EventCard } from "./EventCard";
import { DatePicker } from "@/components/ui/Pickers";
import { Select } from "@/components/ui/Select";
import { organizerBySlug, slugify, ticketsLeftTotal } from "@/lib/organizers";

const PAGE_SIZE = 6;

type Sort = "soonest" | "popular" | "price-asc" | "price-desc";
type DateRange = "any" | "week" | "weekend" | "this-month" | "next-month" | "pick";
type Price = "any" | "free" | "paid";

const sortOptions: { value: Sort; label: string }[] = [
  { value: "soonest", label: "Soonest first" },
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const dateOptions: { value: DateRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "week", label: "Next 7 days" },
  { value: "weekend", label: "This weekend" },
  { value: "this-month", label: "This month" },
  { value: "next-month", label: "Next month" },
  { value: "pick", label: "Pick a date…" },
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const soldOf = (e: (typeof events)[number]) => e.ticketTypes.reduce((n, t) => n + t.sold, 0);

function inRange(iso: string, range: DateRange, now: Date, picked: string) {
  if (range === "any") return true;
  // Events are in Korea time, and the date part of the stored string is the Korean calendar date.
  const day = iso.slice(0, 10);
  if (range === "pick") return !picked || day === picked;
  if (range === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return day >= ymd(now) && day <= ymd(end);
  }
  if (range === "weekend") {
    const sat = new Date(now);
    sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7));
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    // On a Sunday the weekend is already under way: today still counts.
    const from = now.getDay() === 0 ? ymd(now) : ymd(sat);
    const to = now.getDay() === 0 ? ymd(now) : ymd(sun);
    return day >= from && day <= to;
  }
  const d = new Date(iso);
  const offset = range === "this-month" ? 0 : 1;
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
}

export function EventsBrowser() {
  const params = useSearchParams();
  const initialCategory = params.get("category") as CategoryId | null;

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [selected, setSelected] = useState<CategoryId[]>(
    initialCategory && categories.some((c) => c.id === initialCategory) ? [initialCategory] : [],
  );
  const [city, setCity] = useState(params.get("city") ?? "");
  const [organizer, setOrganizer] = useState(params.get("organizer") ?? "");
  const [available, setAvailable] = useState(false);
  const [date, setDate] = useState<DateRange>("any");
  const [pickedDate, setPickedDate] = useState("");
  const [price, setPrice] = useState<Price>("any");
  const [sort, setSort] = useState<Sort>("soonest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = query.trim().toLowerCase();
    const list = events.filter((e) => {
      if (q && !`${e.title} ${e.venue} ${e.city} ${e.organizer}`.toLowerCase().includes(q)) return false;
      if (selected.length && !selected.includes(e.category)) return false;
      if (city && e.city !== city) return false;
      if (organizer && slugify(e.organizer) !== organizer) return false;
      if (available && ticketsLeftTotal(e) === 0) return false;
      if (!inRange(e.startsAt, date, now, pickedDate)) return false;
      const p = fromPrice(e);
      if (price === "free" && p !== 0) return false;
      if (price === "paid" && p === 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "price-asc") return fromPrice(a) - fromPrice(b);
      if (sort === "price-desc") return fromPrice(b) - fromPrice(a);
      if (sort === "popular") return soldOf(b) - soldOf(a);
      return a.startsAt.localeCompare(b.startsAt);
    });
  }, [query, selected, city, organizer, available, date, pickedDate, price, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const to = (current - 1) * PAGE_SIZE + visible.length;

  const dirty = query !== "" || selected.length > 0 || city !== "" || organizer !== "" || available || date !== "any" || price !== "any";

  function clearAll() {
    setQuery("");
    setSelected([]);
    setCity("");
    setOrganizer("");
    setAvailable(false);
    setDate("any");
    setPickedDate("");
    setPrice("any");
    setPage(1);
  }

  /** Wraps a state setter so any filter change returns to page 1. */
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const countFor = (id: CategoryId) => events.filter((e) => e.category === id).length;

  return (
    <div className="mx-auto grid max-w-site gap-8 px-5 py-10 lg:grid-cols-[17rem_1fr]">
      <aside aria-label="Filters" className="h-fit rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-[108px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Filters</h2>
          <button
            type="button"
            onClick={clearAll}
            disabled={!dirty}
            className="text-xs font-bold text-amber hover:text-gold disabled:cursor-default disabled:opacity-40"
          >
            Clear all
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-gold">
          <Search size={14} className="text-muted" aria-hidden />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Search events"
            className="h-10 w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none"
          />
        </label>

        <fieldset className="mt-6">
          <legend className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Category</legend>
          <ul className="space-y-3">
            {categories.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 text-[13px] text-text">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        reset(setSelected)(checked ? selected.filter((s) => s !== c.id) : [...selected, c.id])
                      }
                      className="checkbox-box size-4 shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
                    />
                    <span className="flex-1">{c.label}</span>
                    <span className="text-xs text-dim">{countFor(c.id)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mt-6 space-y-5 border-t border-line pt-6">
          <SelectBox label="City" icon={<MapPin size={14} />} value={city} onChange={reset(setCity)}>
            <option value="">All cities</option>
            {citiesWithEvents.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectBox>
          <SelectBox label="Date" icon={<Calendar size={14} />} value={date} onChange={reset((v: string) => setDate(v as DateRange))}>
            {dateOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectBox>
          {date === "pick" && (
            <DatePicker
              value={pickedDate}
              onChange={(e) => reset(setPickedDate)(e.target.value)}
              placeholder="Choose a day"
              aria-label="Event day"
              className="-mt-2 h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none"
            />
          )}

          <label className="flex cursor-pointer items-center gap-3 text-[13px] text-text">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => reset(setAvailable)(e.target.checked)}
              className="checkbox-box size-4 shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface-2 checked:border-amber checked:bg-amber focus-visible:focus-ring"
            />
            Only events with tickets left
          </label>

          <fieldset>
            <legend className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Price</legend>
            <div className="flex gap-2">
              {(["any", "free", "paid"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={price === p}
                  onClick={() => reset(setPrice)(p)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold capitalize transition-colors focus-visible:focus-ring ${
                    price === p
                      ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink"
                      : "border-line text-muted hover:text-text"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </aside>

      <section aria-label="Events">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text">
            <strong className="font-bold">
              {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </strong>
            {organizer && (
              <button
                type="button"
                onClick={() => reset(setOrganizer)("")}
                className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold hover:bg-gold/20"
              >
                By {organizerBySlug(organizer)?.name ?? organizer} <X size={12} aria-hidden />
                <span className="sr-only">Remove organizer filter</span>
              </button>
            )}
            {filtered.length > 0 && (
              <span className="ml-3 text-xs text-dim">
                Showing {from}–{to}
              </span>
            )}
          </p>
          <label className="flex items-center gap-3 text-xs text-dim">
            Sort by
            <span className="relative">
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 rounded-lg border border-line bg-surface py-0 pl-3 pr-3 text-[13px] font-bold text-text focus:border-gold focus:outline-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </span>
          </label>
        </div>

        {visible.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-10 text-center">
            <p className="text-base font-bold text-text">No events match your filters</p>
            <p className="mt-2 text-sm text-muted">Try a different location or date, or clear the filters.</p>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
            <PagerButton label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft size={16} />
            </PagerButton>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <PagerButton key={n} label={`Page ${n}`} active={n === current} onClick={() => setPage(n)}>
                {n}
              </PagerButton>
            ))}
            <PagerButton label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
              <ChevronRight size={16} />
            </PagerButton>
          </nav>
        )}
      </section>
    </div>
  );
}

function PagerButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-full border text-[13px] font-bold transition-colors focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink" : "border-line text-text hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  );
}

function SelectBox({
  label,
  icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className="relative flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 focus-within:border-gold">
        <span className="text-muted">{icon}</span>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full bg-transparent pr-3 text-[13px] text-text focus:outline-none"
        >
          {children}
        </Select>
      </span>
    </label>
  );
}
