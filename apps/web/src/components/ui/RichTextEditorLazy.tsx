"use client";

import dynamic from "next/dynamic";

/**
 * The editor is browser-only (Tiptap generates ids with Math.random, which Next won't allow while prerendering),
 * so it is loaded on the client after the page shell. The placeholder keeps the form from jumping.
 */
export const RichTextEditor = dynamic(() => import("./RichTextEditor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Loading editor">
      <span className="mb-2 block text-xs font-bold text-muted">Description</span>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="h-[49px] border-b border-line bg-surface-2" />
        <div className="min-h-44" />
        <div className="h-[37px] border-t border-line bg-surface-2" />
      </div>
    </div>
  ),
});
