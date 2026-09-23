/**
 * Shared class strings for the admin panel.
 *
 * Centralised so a control looks the same everywhere it appears — the forms
 * previously each declared their own `field` / `label` / `card` constants and
 * had already started to drift apart.
 */

export const panel = "rounded-panel border border-rule bg-porcelain";

export const field =
  "w-full rounded-panel border border-rule bg-white px-3 py-2 text-[14px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-cobalt disabled:bg-kaolin/60 disabled:text-ink/35";

export const label = "mb-1.5 block text-[12px] text-ink/50";

export const heading = "font-display text-[15px] text-ink";

/* buttons */
export const btnPrimary =
  "inline-flex items-center justify-center rounded-panel bg-ink px-4 py-2.5 text-[14px] font-medium text-porcelain transition-colors hover:bg-cobalt disabled:opacity-50 disabled:hover:bg-ink";

export const btnGhost =
  "inline-flex items-center justify-center rounded-panel border border-ink/20 px-4 py-2.5 text-[14px] text-ink transition-colors hover:border-ink disabled:opacity-50";

export const btnQuiet =
  "inline-flex items-center justify-center rounded-panel px-3 py-2.5 text-[14px] text-ink/55 transition-colors hover:text-ink disabled:opacity-50";

export const btnDanger =
  "text-[13px] text-clay transition-colors hover:text-ink";

/* table */
export const th = "px-4 py-3 text-[12px] font-normal text-ink/50";
export const td = "px-4 py-3 text-[14px] text-ink/75";