// Uploaded files (payment screenshots) on the server's own disk. Server code only.
//
// Files live outside the website's public folder, so nobody can open one by guessing its address: they are served
// only through a route that checks who is asking. On Hostinger, set UPLOAD_DIR to a folder that survives redeploys.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// The /*turbopackIgnore*/ comments tell the build these are runtime folders, not files of the website to bundle.
const ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads"));

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The kinds of file accepted, recognised by their first bytes rather than by the name or the browser's word for it. */
const KINDS = [
  { ext: "jpg", type: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "png", type: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: "pdf", type: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
] as const;

export type FileKind = (typeof KINDS)[number];

export function sniff(bytes: Uint8Array): FileKind | undefined {
  return KINDS.find((k) => k.magic.every((b, i) => bytes[i] === b));
}

export const contentTypeOf = (filePath: string) => KINDS.find((k) => filePath.toLowerCase().endsWith(`.${k.ext}`))?.type ?? "application/octet-stream";

/** Saves a file under `folder` with a random name and returns its path relative to the upload folder. */
export async function saveUpload(folder: string, bytes: Uint8Array, kind: FileKind): Promise<string> {
  const safeFolder = folder
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^A-Za-z0-9_-]/g, "_"))
    .join("/");
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${kind.ext}`;
  await mkdir(path.join(/*turbopackIgnore: true*/ ROOT, safeFolder), { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ ROOT, safeFolder, name), bytes);
  return `${safeFolder}/${name}`;
}

/** Reads a stored file, or null if it is missing. Paths that would leave the upload folder are refused. */
export async function readUpload(relative: string): Promise<Buffer | null> {
  const full = path.resolve(/*turbopackIgnore: true*/ ROOT, relative);
  if (!full.startsWith(ROOT + path.sep)) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ full);
  } catch {
    return null;
  }
}

/* ---------- public pictures (event covers, seating plans) ---------- */

/** Pictures customers may see are kept under media/ and served at /media/... by app/media/[...path]/route.ts. */
const MEDIA = "media";
const IMAGE_KINDS = new Set(["jpg", "png"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Takes what the editor sent for a picture: a "data:" URL (a new picture) is stored and its /media/ address returned;
 * an address already under /media/ is kept; anything else (empty, or an outside link) becomes null.
 */
export async function storeImage(folder: string, value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith(`/${MEDIA}/`)) return value;
  const m = value.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bytes = Buffer.from(m[1]!, "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("That picture is too large (over 5 MB).");
  const kind = sniff(bytes);
  if (!kind || !IMAGE_KINDS.has(kind.ext)) throw new Error("Pictures must be JPG or PNG.");
  return `/${await saveUpload(`${MEDIA}/${folder}`, bytes, kind)}`;
}

/** A public picture by its /media/... path, or null. Only files under media/ can be read this way. */
export async function readMedia(parts: string[]): Promise<{ bytes: Buffer; type: string } | null> {
  if (parts.some((p) => !/^[A-Za-z0-9_.-]+$/.test(p) || p.startsWith("."))) return null;
  const relative = [MEDIA, ...parts].join("/");
  const bytes = await readUpload(relative);
  return bytes ? { bytes, type: contentTypeOf(relative) } : null;
}
