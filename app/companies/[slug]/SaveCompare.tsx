"use client";

import { useState, useTransition } from "react";
import { toggleSaveAction, addCompareAction, removeCompareAction } from "@/app/actions";

/*
 * 保存する / 比較に追加 — real writes via shared server actions.
 * Local state is an override on top of the server-provided initial value,
 * so after revalidatePath refreshes the RSC props all instances stay in sync.
 */

export function SaveButton({
  companyId,
  initialSaved,
  path,
  variant,
}: {
  companyId: number;
  initialSaved: boolean;
  path: string;
  variant: "box" | "spbar" | "fav";
}) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const on = override ?? initialSaved;

  const toggle = () => {
    setOverride(!on);
    startTransition(async () => {
      const res = await toggleSaveAction("company", companyId, path);
      setOverride(res.saved);
    });
  };

  if (variant === "fav") {
    return (
      <button
        className={`sp-head__fav${on ? " is-on" : ""}`}
        type="button"
        aria-label={on ? "保存を解除する" : "保存する"}
        onClick={toggle}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 5 6.6 5c2 0 3.6 1.1 4.4 2.7h2c.8-1.6 2.4-2.7 4.4-2.7 3.2 0 5.1 3.2 3.9 6.3-1.8 4.6-9.3 9.2-9.3 9.2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  if (variant === "spbar") {
    return (
      <button className={`sp-bar__btn${on ? " is-on" : ""}`} type="button" id="btn-save-sp" onClick={toggle}>
        {on ? "保存済" : "保存"}
      </button>
    );
  }

  return (
    <button className={`btn btn--lg btn--block co-btn-box${on ? " is-on" : ""}`} type="button" id="btn-save" onClick={toggle}>
      {on ? "保存済み" : "保存する"}
    </button>
  );
}

export function CompareButton({
  companyId,
  initialInCompare,
  path,
}: {
  companyId: number;
  initialInCompare: boolean;
  path: string;
}) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();
  const on = override ?? initialInCompare;

  const toggle = () => {
    if (on) {
      setOverride(false);
      startTransition(async () => {
        await removeCompareAction(companyId, path);
      });
    } else {
      setOverride(true);
      startTransition(async () => {
        const res = await addCompareAction(companyId, path);
        if (!res.ok) {
          setOverride(false);
          setToast("比較に追加できるのは3社までです");
          setTimeout(() => setToast(""), 2400);
        }
      });
    }
  };

  return (
    <>
      <button className={`btn btn--lg btn--block co-btn-box${on ? " is-on" : ""}`} type="button" id="btn-compare" onClick={toggle}>
        {on ? "追加済み" : "比較に追加"}
      </button>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
