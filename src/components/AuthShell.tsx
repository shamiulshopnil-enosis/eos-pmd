import type { ReactNode } from "react";
import { Card } from "primereact/card";
import { BrandLogo } from "@/components/BrandLogo";

/** The sign-in cover — a centred single-task layout. Used by /login and
 *  /invite/[code], both outside the app shell. Built on PrimeReact <Card>. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 inline-flex overflow-hidden rounded-xl">
          <BrandLogo variant="full" className="h-auto w-72 max-w-full" priority />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {intro ? <p className="mt-2 text-sm text-ink-muted">{intro}</p> : null}
        <Card className="eos-card mt-5">{children}</Card>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
