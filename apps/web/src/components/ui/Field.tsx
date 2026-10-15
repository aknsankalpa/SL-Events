"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { DatePicker, TimePicker } from "./Pickers";
import { Select } from "./Select";

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  icon?: ReactNode;
  hint?: string;
  error?: string;
  /** Rendered on the right of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  /** Rendered inside the input box on the right, e.g. a show/hide button. */
  trailing?: ReactNode;
};

export function Field({ label, icon, hint, error, labelAction, trailing, className = "", ...input }: FieldProps) {
  const id = useId();
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const { type, value, defaultValue, onChange, name, disabled, required, placeholder } = input;
  // Dates and times use the app's own pickers instead of the browser's native popups.
  const picker =
    type === "date" || type === "time"
      ? {
          id,
          name,
          disabled,
          required,
          placeholder,
          value: typeof value === "string" ? value : undefined,
          defaultValue: typeof defaultValue === "string" ? defaultValue : undefined,
          onChange: onChange ? (e: { target: { value: string } }) => onChange(e as unknown as ChangeEvent<HTMLInputElement>) : undefined,
          className: "h-full w-full text-sm text-text focus:outline-none",
          "aria-describedby": messageId,
        }
      : null;
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold text-muted">
          {label}
        </label>
        {labelAction}
      </div>
      <div
        className={`flex h-12 items-center gap-3 rounded-lg border bg-surface px-4 transition-colors focus-within:border-gold ${
          error ? "border-danger" : "border-line"
        }`}
      >
        {icon && <span className="text-dim [&>svg]:size-4">{icon}</span>}
        {picker && type === "date" ? (
          <DatePicker {...picker} />
        ) : picker ? (
          <TimePicker {...picker} />
        ) : (
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            className="h-full w-full bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
            {...input}
          />
        )}
        {trailing}
      </div>
      {(error || hint) && (
        <p id={messageId} className={`mt-1.5 text-xs ${error ? "text-danger" : "text-dim"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-dim transition-colors hover:text-text"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}

export function SelectField({
  label,
  icon,
  hint,
  className = "",
  children,
  ...select
}: Omit<ComponentProps<"select">, "id"> & { label: string; icon?: ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-xs font-bold text-muted">
        {label}
      </label>
      <div className="flex h-12 items-center gap-3 rounded-lg border border-line bg-surface px-4 focus-within:border-gold">
        {icon && <span className="text-dim [&>svg]:size-4">{icon}</span>}
        <Select
          id={id}
          value={typeof select.value === "string" ? select.value : undefined}
          defaultValue={typeof select.defaultValue === "string" ? select.defaultValue : undefined}
          onChange={select.onChange ? (e) => select.onChange?.(e as unknown as ChangeEvent<HTMLSelectElement>) : undefined}
          name={select.name}
          disabled={select.disabled}
          className="h-full w-full bg-transparent text-sm text-text focus:outline-none"
        >
          {children}
        </Select>
      </div>
      {hint && <p className="mt-1.5 text-xs text-dim">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, ...input }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[13px] text-muted">
      <input
        type="checkbox"
        className="checkbox-box size-[18px] shrink-0 cursor-pointer appearance-none rounded border border-line bg-surface checked:border-amber checked:bg-amber focus-visible:focus-ring"
        {...input}
      />
      <span>{label}</span>
    </label>
  );
}
