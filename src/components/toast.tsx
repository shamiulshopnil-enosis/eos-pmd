"use client";

import { useEffect, useRef } from "react";
import { Toast } from "primereact/toast";

type Severity = "success" | "info" | "warn" | "error";

let show: ((s: Severity, summary: string, detail?: string) => void) | null = null;

/** Fire a Jira-style flag from anywhere in the client tree. */
export function notify(severity: Severity, summary: string, detail?: string) {
  show?.(severity, summary, detail);
}
export const toastSuccess = (summary: string, detail?: string) => notify("success", summary, detail);
export const toastError = (summary: string, detail?: string) => notify("error", summary, detail);

/** Mounted once in Providers. */
export function ToastHost() {
  const ref = useRef<Toast>(null);
  useEffect(() => {
    show = (severity, summary, detail) =>
      ref.current?.show({ severity, summary, detail, life: severity === "error" ? 6000 : 3500 });
    return () => {
      show = null;
    };
  }, []);
  return <Toast ref={ref} position="bottom-left" className="eos-toast" />;
}
