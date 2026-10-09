"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:focus-ring disabled:cursor-not-allowed ${
        checked ? "bg-gradient-to-b from-gold to-amber" : "bg-line"
      } ${disabled ? "opacity-70" : ""}`}
    >
      <span
        className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
