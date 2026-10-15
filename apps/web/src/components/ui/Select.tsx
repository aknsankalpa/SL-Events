"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { PopoverPanel, placePopover, type PopoverPlacement } from "./Popover";

/** Like <option>, plus an optional second line. Plain <option> children work too. */
export function SelectOption(props: { value?: string; description?: string; disabled?: boolean; children?: ReactNode }) {
  void props; // read by <Select>, never rendered on its own
  return null;
}

type Opt = { value: string; label: string; description?: string; disabled?: boolean };
type OptionProps = { value?: string | number; disabled?: boolean; description?: string; children?: ReactNode };

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function collect(children: ReactNode, out: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<OptionProps>;
    if (el.type === Fragment) {
      collect(el.props.children, out);
    } else if (el.type === "option" || el.type === SelectOption) {
      const label = textOf(el.props.children);
      out.push({
        value: el.props.value !== undefined ? String(el.props.value) : label,
        label,
        description: el.props.description,
        disabled: el.props.disabled,
      });
    }
  });
  return out;
}

type SelectProps = {
  value?: string;
  defaultValue?: string;
  /** Receives `{ target: { value } }`, so handlers written for a native <select> keep working. */
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  /** Classes for the closed field. Size, border and colours come from the caller, like a native select. */
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  /** Replaces the selected label inside the closed field (e.g. a thumbnail plus a title). */
  triggerContent?: ReactNode;
};

const ROW_HEIGHT = 40;

/**
 * The app's dropdown: a button that opens a dark, rounded list with the selected row in gold. Drop-in for
 * <select> with <option> children, but styled like the rest of the UI instead of the browser's native menu.
 */
export function Select({
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  className = "",
  children,
  triggerContent,
  "aria-label": ariaLabel,
}: SelectProps) {
  const uid = useId();
  const options = collect(children);
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value !== undefined ? value : inner;
  const selected = options.find((o) => o.value === current);

  const trigger = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });
  const open = placement !== null;

  const close = useCallback(() => setPlacement(null), []);

  function openList() {
    if (disabled || !trigger.current) return;
    const idx = Math.max(0, options.findIndex((o) => o.value === current));
    setActive(idx);
    setPlacement(
      placePopover(trigger.current, { height: options.length * ROW_HEIGHT + 12, minWidth: 176 }),
    );
  }

  function choose(opt: Opt) {
    if (opt.disabled) return;
    if (value === undefined) setInner(opt.value);
    onChange?.({ target: { value: opt.value, name } });
    close();
    trigger.current?.focus();
  }

  const move = (from: number, step: 1 | -1) => {
    for (let i = from + step; i >= 0 && i < options.length; i += step) if (!options[i]!.disabled) return i;
    return from;
  };

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const key = e.key;
    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (key === "Escape") {
      // Keep a modal <dialog> underneath from also closing on this Escape.
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => move(a, 1));
    } else if (key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => move(a, -1));
    } else if (key === "Home") {
      e.preventDefault();
      setActive(move(-1, 1));
    } else if (key === "End") {
      e.preventDefault();
      setActive(move(options.length, -1));
    } else if (key === "Enter" || key === " ") {
      e.preventDefault();
      const opt = options[active];
      if (opt) choose(opt);
    } else if (key === "Tab") {
      close();
    } else if (key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Type-ahead: "se" jumps to the first row that starts with "se".
      const now = Date.now();
      const t = typed.current;
      t.text = now - t.at > 700 ? key.toLowerCase() : t.text + key.toLowerCase();
      t.at = now;
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (hit >= 0) setActive(hit);
    }
  }

  const listId = `${uid}-list`;
  const dim = disabled && !/disabled:opacity/.test(className) ? "opacity-60" : "";

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${dim} ${className} ${
          open ? "!border-gold" : ""
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${current === "" ? "text-muted" : ""}`}>
          {triggerContent ?? selected?.label ?? ""}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180 text-gold" : ""}`}
        />
      </button>
      {name && <input type="hidden" name={name} value={current} />}

      {placement && (
        <PopoverPanel anchor={trigger} placement={placement} onClose={close} id={listId} role="listbox" label={ariaLabel}>
          {options.map((o, i) => {
            const isSelected = o.value === current;
            return (
              <div
                key={`${o.value}-${i}`}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={o.disabled || undefined}
                ref={(el) => {
                  if (el && i === active) el.scrollIntoView({ block: "nearest" });
                }}
                // mousedown would blur the trigger and close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => choose(o)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
                  o.disabled
                    ? "cursor-not-allowed text-dim"
                    : isSelected
                      ? "bg-gold/15 font-bold text-gold"
                      : i === active
                        ? "bg-surface-2 text-text"
                        : "text-muted"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.description && <span className="mt-0.5 block truncate text-[11px] font-normal text-dim">{o.description}</span>}
                </span>
                {isSelected && <Check size={14} aria-hidden className="shrink-0" />}
              </div>
            );
          })}
        </PopoverPanel>
      )}
    </>
  );
}
