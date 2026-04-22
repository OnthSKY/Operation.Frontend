"use client";

import { TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { cn } from "@/lib/cn";
import { useEffect, useState, type ReactNode } from "react";

type StickyActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const rawOffset = window.innerHeight - (vv.height + vv.offsetTop);
      setKeyboardOffset(rawOffset > 0 ? rawOffset : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <div
      role="region"
      aria-label="Sticky actions"
      style={{
        bottom: keyboardOffset,
        transition: "bottom 180ms ease",
      }}
      className={cn(
        "fixed inset-x-0 z-[80] border-t border-zinc-200 bg-white/95 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85",
        className
      )}
    >
      <div
        className="mx-auto w-full max-w-screen-md"
        style={{ minHeight: TOUCH_TARGET_MIN }}
      >
        {children}
      </div>
    </div>
  );
}
