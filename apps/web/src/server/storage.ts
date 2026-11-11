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
