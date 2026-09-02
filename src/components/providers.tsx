"use client";

import { PrimeReactProvider } from "primereact/api";
import type { ReactNode } from "react";

/**
 * App-wide PrimeReact context. Every interactive widget in the product is a
 * PrimeReact component; this provider carries the shared configuration
 * (ripple, outlined inputs, the shared z-index stack for overlays).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrimeReactProvider
      value={{
        ripple: true,
        inputStyle: "outlined",
        zIndex: {
          modal: 1100,
          overlay: 1000,
          menu: 1000,
          tooltip: 1100,
          toast: 1200,
        },
      }}
    >
      {children}
    </PrimeReactProvider>
  );
}
