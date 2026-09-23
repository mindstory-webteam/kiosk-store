"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductMedia } from "@/types";

type Props = {
  media: ProductMedia[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * Fullscreen viewer for a product's photographs.
 *
 * Keyboard: ← → to move, Esc to close. Focus is moved into the dialog on open
 * and returned to whatever opened it on close, and page scrolling is locked
 * while it is up.
 */
const Lightbox = ({ media, index, title, onIndexChange, onClose }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Rendered into <body> rather than in place, so a sticky navbar's stacking
  // context can't paint over the overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = media.length;
  const current = media[index];

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setLoaded(false);
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange]
  );

  /* Remember the trigger, take focus, restore it on close. */
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => openerRef.current?.focus?.();
  }, []);

  /* Lock the page behind the overlay. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!current || !mounted) return null;

  const arrow =
    "absolute top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-[#F6F4F0]/10 text-[#F6F4F0] backdrop-blur transition-colors hover:bg-[#F6F4F0]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6F4F0]";

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photograph ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-lightbox flex flex-col bg-[#171E1B] outline-none"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {/* header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
        <p className="font-display text-[15px] text-[#F6F4F0]">{title}</p>
        <div className="flex items-center gap-5">
          <span className="text-[13px] tabular-nums text-[#F6F4F0]/50">
            {index + 1} / {count}
          </span>
          <button
            onClick={onClose}
            className="rounded-[2px] px-2 py-1 text-[14px] text-[#F6F4F0]/70 transition-colors hover:text-[#F6F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6F4F0]"
          >
            Close
          </button>
        </div>
      </div>

      {/* stage — clicking the empty space closes */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {current.type === "video" ? (
          <video
            src={current.url}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-[2px]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            src={current.url}
            alt={current.alt || title}
            onLoad={() => setLoaded(true)}
            className={`max-h-full max-w-full rounded-[2px] object-contain transition-opacity duration-300 motion-reduce:transition-none ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {count > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photograph" className={`${arrow} left-2 sm:left-6`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={() => go(1)} aria-label="Next photograph" className={`${arrow} right-2 sm:right-6`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* filmstrip */}
      {count > 1 && (
        <div className="filmstrip shrink-0 overflow-x-auto px-5 py-5 sm:px-8">
          <div className="mx-auto flex w-max gap-2">
            {media.map((m, i) => (
              <button
                key={`${m.url}-${i}`}
                onClick={() => {
                  setLoaded(false);
                  onIndexChange(i);
                }}
                aria-label={`Photograph ${i + 1}`}
                aria-current={i === index}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-[2px] bg-[#F6F4F0] transition-opacity ${
                  i === index ? "opacity-100 ring-2 ring-[#F6F4F0]" : "opacity-45 hover:opacity-80"
                }`}
              >
                {m.type === "video" ? (
                  <video src={m.url} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default Lightbox;