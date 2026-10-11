"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio/sound";

/**
 * Texto que aparece letra a letra, com som de máquina de escrever.
 * Clicar revela tudo de uma vez. Respeita a preferência por movimento reduzido.
 */
export function Typewriter({
  lines,
  speed = 22,
  onDone,
  className,
}: {
  lines: string[];
  speed?: number;
  onDone?: () => void;
  className?: string;
}) {
  const full = lines.join("\n");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduced =
      document.documentElement.dataset.motion === "reduzir" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCount(full.length);
      return;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        if (next % 3 === 0 && full[next - 1] !== " ") sound.play("type");
        if (next >= full.length) clearInterval(timer);
        return Math.min(next, full.length);
      });
    }, speed);
    return () => clearInterval(timer);
  }, [full, speed]);

  const done = count >= full.length;
  useEffect(() => {
    if (done) onDone?.();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = full.slice(0, count).split("\n");

  return (
    <div
      className={className}
      onClick={() => setCount(full.length)}
      role="presentation"
    >
      {/* Leitores de tela recebem o texto completo de imediato */}
      <div className="sr-only" aria-live="polite">
        {lines.join(" ")}
      </div>
      <div aria-hidden className="space-y-2">
        {visible.map((line, i) => (
          <p key={i}>
            {line}
            {i === visible.length - 1 && !done && <span className="ml-0.5 inline-block w-2 animate-pulse bg-accent">&nbsp;</span>}
          </p>
        ))}
      </div>
      {!done && <p className="mt-2 text-xs text-muted" aria-hidden>(toque para pular)</p>}
    </div>
  );
}
