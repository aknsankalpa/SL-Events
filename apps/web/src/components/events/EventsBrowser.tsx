"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";
import { categories, citiesWithEvents, events, fromPrice, type CategoryId } from "@/lib/data";
import { EventCard } from "./EventCard";

const PAGE_SIZE = 6;

type Sort = "soonest" | "price-asc" | "price-desc";
type DateRange = "any" | "this-month" | "next-month";
type Price = "any" | "free" | "paid";

const sortOptions: { value: Sort; label: string }[] = [
  { value: "soonest", label: "Soonest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const dateOptions: { value: DateRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "this-month", label: "This month" },
  { value: "next-month", label: "Next month" },
];

function inRange(iso: string, range: DateRange, now: Date) {
  if (range === "any") return true;
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
  const [date, setDate] = useState<DateRange>("any");
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
      if (!inRange(e.startsAt, date, now)) return false;
      const p = fromPrice(e);
      if (price === "free" && p !== 0) return false;
      if (price === "paid" && p === 0) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "price-asc") return fromPrice(a) - fromPrice(b);
      if (sort === "price-desc") return fromPrice(b) - fromPrice(a);
      return a.startsAt.localeCompare(b.startsAt);
    });
  }, [query, selected, city, date, price, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const to = (current - 1) * PAGE_SIZE + visible.length;

  const dirty = query !== "" || selected.length > 0 || city !== "" || date !== "any" || price !== "any";

  function clearAll() {
    setQuery("");
    setSelected([]);
    setCity("");
    setDate("any");
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
          <p className="text-sm text-text">
            <strong className="font-bold">
              {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </strong>
            {filtered.length > 0 && (
              <span className="ml-3 text-xs text-dim">
                Showing {from}–{to}
              </span>
            )}
          </p>
          <label className="flex items-center gap-3 text-xs text-dim">
            Sort by
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 appearance-none rounded-lg border border-line bg-surface py-0 pl-3 pr-9 text-[13px] font-bold text-text focus:border-gold focus:outline-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-3 text-muted" />
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
            <p className="mt-2 text-sm text-muted">Try a different city or clear the filters.</p>
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
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none bg-transparent pr-6 text-[13px] text-text focus:outline-none"
        >
          {children}
        </select>
        <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 text-muted" />
      </span>
    </label>
  );
}
