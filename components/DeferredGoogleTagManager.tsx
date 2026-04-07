"use client";

import { GoogleTagManager } from "@next/third-parties/google";
import { useEffect, useState } from "react";

const INTERACTION_EVENTS = ["scroll", "mousemove", "keydown", "touchstart"] as const;

export type DeferredGoogleTagManagerProps = {
  gtmId: string;
  nonce?: string;
  /** Délai max (ms) avant chargement GTM sans interaction — défaut 3000 */
  safetyTimeoutMs?: number;
};

/**
 * N’injecte GTM qu’après une interaction utilisateur (scroll, souris, clavier, tactile)
 * ou après un timeout, pour limiter le coût TBT/LCP au premier rendu.
 */
export default function DeferredGoogleTagManager({
  gtmId,
  nonce,
  safetyTimeoutMs = 3000,
}: DeferredGoogleTagManagerProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return undefined;

    let done = false;
    const activate = () => {
      if (done) return;
      done = true;
      setActive(true);
    };

    const listenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    const onInteract = () => activate();

    for (const evt of INTERACTION_EVENTS) {
      window.addEventListener(evt, onInteract, listenerOptions);
    }
    const timer = window.setTimeout(activate, safetyTimeoutMs);

    return () => {
      window.clearTimeout(timer);
      for (const evt of INTERACTION_EVENTS) {
        window.removeEventListener(evt, onInteract, listenerOptions);
      }
    };
  }, [active, safetyTimeoutMs]);

  if (!active) return null;

  return <GoogleTagManager gtmId={gtmId} nonce={nonce} />;
}
