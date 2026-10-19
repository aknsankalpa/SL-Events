/** Shown while a page in the site is loading: a quiet skeleton in the shape of a typical page. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-site animate-pulse px-5 py-12">
      <div className="h-4 w-32 rounded bg-surface-2" />
      <div className="mt-4 h-10 w-2/3 max-w-md rounded bg-surface-2" />
      <div className="mt-3 h-4 w-1/2 max-w-sm rounded bg-surface" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-64 rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
