"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
  children: (size: { width: number; height: number }) => ReactNode;
};

/**
 * Recharts `ResponsiveContainer` parent'ı 0×0 iken ölçüm yapıp `width(-1)` uyarısı basıyor.
 * Bu kutu ResizeObserver ile gerçek boyutu alır; grafik sadece w,h > 0 iken mount edilir.
 */
export function RechartsMeasureBox({ className, style, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [[w, h], setSize] = useState([0, 0]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const nw = Math.max(0, Math.floor(r.width));
      const nh = Math.max(0, Math.floor(r.height));
      setSize((prev) =>
        prev[0] === nw && prev[1] === nh ? prev : [nw, nh]
      );
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} style={style}>
      {w > 0 && h > 0 ? children({ width: w, height: h }) : null}
    </div>
  );
}
