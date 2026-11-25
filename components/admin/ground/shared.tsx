"use client";

import { useState, useTransition } from "react";
import { GripVertical, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { GroundState } from "@/app/admin/(protected)/ground/types";

/** Run a `(FormData) => Promise<GroundState>` server action with pending + status. */
export function useGroundAction() {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: boolean; message?: string } | null>(
    null,
  );
  function run(
    action: (fd: FormData) => Promise<GroundState>,
    fd: FormData,
    onOk?: () => void,
  ) {
    setStatus(null);
    start(async () => {
      const res = await action(fd);
      setStatus(res);
      if (res.ok && onOk) onOk();
    });
  }
  return { pending, status, setStatus, run };
}

export function StatusLine({
  status,
}: {
  status: { error?: string; ok?: boolean; message?: string } | null;
}) {
  if (!status) return null;
  if (status.error)
    return <p className="mt-1 text-xs text-[var(--closed)]">{status.error}</p>;
  if (status.message)
    return <p className="mt-1 text-xs text-primary">{status.message}</p>;
  return null;
}

export const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

export const labelClass =
  "font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase";

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Button that submits a single-field action (visibility/consent toggle, delete). */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  className,
  disabled,
  title,
  onDone,
}: {
  action: (fd: FormData) => Promise<GroundState>;
  fields: Record<string, string>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  onDone?: (res: GroundState) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={title}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.append(k, v);
        start(async () => {
          const res = await action(fd);
          if (res.error) window.alert(res.error);
          onDone?.(res);
        });
      }}
      className={
        className ??
        "inline-flex items-center gap-1 rounded-sm border border-input px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary disabled:opacity-50"
      }
    >
      {pending && <Loader2 className="size-3 animate-spin" />}
      {children}
    </button>
  );
}

export type Orderable = { id: string };

/**
 * Drag-and-drop ordered list with keyboard up/down fallback (accessible). Calls
 * `onReorder` with the new id order on drop / arrow press.
 */
export function SortableList<T extends Orderable>({
  items,
  onReorder,
  renderItem,
  pending,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  pending?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onReorder(next.map((i) => i.id));
  }

  return (
    <ul className="flex flex-col gap-2" aria-busy={pending}>
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragEnd={() => setDragId(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragId) return;
            const from = items.findIndex((i) => i.id === dragId);
            move(from, index);
            setDragId(null);
          }}
          className={`flex items-start gap-2 rounded-md border bg-background p-2 ${
            dragId === item.id ? "border-primary opacity-60" : "border-border"
          }`}
        >
          <div className="flex flex-col items-center pt-1 text-muted-foreground">
            <span className="cursor-grab" aria-hidden title="Drag to reorder">
              <GripVertical className="size-4" />
            </span>
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              aria-label="Move up"
              className="disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(index, index + 1)}
              disabled={index === items.length - 1}
              aria-label="Move down"
              className="disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  );
}
