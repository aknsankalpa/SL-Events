"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Check, Globe, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, SelectField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/StatusBadge";
import { cities, currentUser } from "@/lib/data";
import { historyStats } from "@/lib/bookings";

const languages = ["English", "සිංහල (Sinhala)", "தமிழ் (Tamil)", "한국어 (Korean)"];

export function ProfileForm() {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo]);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: PATCH the profile via the API.
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function onPhoto(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(URL.createObjectURL(file));
  }

  function deleteAccount() {
    if (window.confirm("Delete your account? Your tickets and booking history will be removed.")) {
      // TODO: call the delete-account API.
      router.push("/login");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-5 overflow-hidden bg-gradient-to-r from-surface via-surface to-[#2a0d0d] p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <span className="flex size-[88px] items-center justify-center overflow-hidden rounded-full border-2 border-gold/60 bg-surface-2 text-3xl font-bold text-gold">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={photo} alt="Your profile photo" className="size-full object-cover" />
              ) : (
                currentUser.initials
              )}
            </span>
            <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-gold to-amber text-ink">
              <Camera size={13} />
            </span>
          </div>
          <div>
            <h1 className="font-display text-[28px] font-bold leading-tight text-text">{currentUser.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted">{currentUser.email}</span>
              <Badge tone="success" dot>
                Email verified
              </Badge>
            </div>
            <p className="mt-2 text-[11px] text-dim">
              Member since {currentUser.memberSince} · {historyStats.bookings} bookings
            </p>
          </div>
        </div>
        <Button variant="outline" className="border-line text-text hover:bg-surface-2" onClick={() => photoInput.current?.click()}>
          <Pencil size={14} aria-hidden /> Change photo
        </Button>
        <input ref={photoInput} type="file" accept="image/*" className="sr-only" aria-label="Upload a profile photo" onChange={(e) => onPhoto(e.target.files?.[0])} />
      </Card>

      <form onSubmit={onSave} className="space-y-5">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-text">Personal information</h2>
            <div className="flex items-center gap-3">
              <span role="status" className="flex items-center gap-1.5 text-xs text-success">
                {saved && (
                  <>
                    <Check size={14} aria-hidden /> Saved
                  </>
                )}
              </span>
              <Button type="submit" size="sm">
                Save changes
              </Button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="name" defaultValue={currentUser.fullName} autoComplete="name" />
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={currentUser.email}
              autoComplete="email"
              trailing={<BadgeCheck size={16} aria-label="Verified" className="text-success" />}
            />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field label="Mobile number" name="phone" type="tel" defaultValue={currentUser.phone} icon={<Phone />} autoComplete="tel" />
            <SelectField label="City" name="city" defaultValue={currentUser.city} icon={<MapPin />}>
              {cities.map((c) => (
                <option key={c} className="bg-surface">
                  {c}
                </option>
              ))}
            </SelectField>
            <SelectField label="Language" name="language" defaultValue={currentUser.language} icon={<Globe />}>
              {languages.map((l) => (
                <option key={l} className="bg-surface">
                  {l}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>

      </form>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-text">Security</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-[13px] font-bold text-text">Password</p>
            <p className="mt-1 text-[11px] text-dim">Last changed 2 months ago</p>
          </div>
          <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2">
            Change password
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-[13px] font-bold text-text">Logged-in devices</p>
            <p className="mt-1 text-[11px] text-dim">Chrome on Windows · iPhone app</p>
          </div>
          <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2">
            Log out other devices
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger/30 bg-danger/5 p-6">
        <div>
          <p className="text-[13px] font-bold text-danger">Delete account</p>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-dim">
            Your tickets and booking history will be removed. Payment records are kept for 5 years as the law requires.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteAccount}
          className="border-danger/50 text-danger hover:bg-danger/10"
        >
          <Trash2 size={14} aria-hidden /> Delete account
        </Button>
      </div>
    </div>
  );
}
