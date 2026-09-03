import type { Metadata } from "next";
import Script from "next/script";
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/lara-light-amber/theme.css";
import "primeicons/primeicons.css";
import "./globals.css";
import { Providers } from "@/components/providers";

// Set the theme class before hydration so the page never flashes the wrong ground.
const themeScript = `(function(){try{var s=localStorage.getItem('eos-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export const metadata: Metadata = {
  title: "EOS Performance Monitoring",
  description: "Private project delivery & milestone-based client reviews (MVP prototype)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-paper font-sans text-ink antialiased">
        <Script id="eos-theme-no-flash" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
