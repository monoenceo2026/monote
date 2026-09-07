"use client";

import { useEffect } from "react";

/** Adds a class to <body> while the page is mounted (page-scoped body styling). */
export default function BodyClass({ className }: { className: string }) {
  useEffect(() => {
    const cls = className.split(/\s+/).filter(Boolean);
    document.body.classList.add(...cls);
    return () => document.body.classList.remove(...cls);
  }, [className]);
  return null;
}
