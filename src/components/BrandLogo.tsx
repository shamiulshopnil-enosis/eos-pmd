import Image from "next/image";

/**
 * The Enosis PM Dashboard logo. `full` and `compact` are horizontal lockups
 * (2172×724, 3:1) with light/dark artwork swapped by the `.dark` root class;
 * `icon` is the standalone mark, theme-neutral. Size it from the outside with a
 * height class, e.g. `<BrandLogo variant="compact" className="h-10 w-auto" />`.
 */

const LOCKUP_RATIO = 2172 / 724;
const ICON_RATIO = 1272 / 1237;
const RENDER_H = 160; // intrinsic px handed to next/image; display size comes from className

const LOCKUPS = {
  full: {
    light: "/brand/enosis-pmd-full-light.png",
    dark: "/brand/enosis-pmd-full-dark.png",
  },
  compact: {
    light: "/brand/enosis-pmd-compact-light.png",
    dark: "/brand/enosis-pmd-compact-dark.png",
  },
} as const;

export function BrandLogo({
  variant,
  className = "",
  priority = false,
  alt = "Enosis PM Dashboard",
}: {
  variant: "full" | "compact" | "icon";
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  if (variant === "icon") {
    return (
      <Image
        src="/brand/enosis-pmd-icon.png"
        alt={alt}
        width={Math.round(RENDER_H * ICON_RATIO)}
        height={RENDER_H}
        priority={priority}
        className={className}
      />
    );
  }

  const src = LOCKUPS[variant];
  const w = Math.round(RENDER_H * LOCKUP_RATIO);

  return (
    <>
      <Image
        src={src.light}
        alt={alt}
        width={w}
        height={RENDER_H}
        priority={priority}
        className={`${className} block dark:hidden`.trim()}
      />
      <Image
        src={src.dark}
        alt=""
        aria-hidden
        width={w}
        height={RENDER_H}
        priority={priority}
        className={`${className} hidden dark:block`.trim()}
      />
    </>
  );
}
