"use client";

import { useMemo } from "react";
import { sanitizeRichHtml } from "@/lib/richText";

/** Shows organizer-written rich text. The HTML is sanitised first, so it is safe to inject. */
export function RichText({ html, className = "" }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeRichHtml(html), [html]);
  // Safe to inject: sanitizeRichHtml() applies a strict DOMPurify allow-list.
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
