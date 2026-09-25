"use client";

interface BrandMarkProps {
  name: string;
  size?: number;
  logoUrl?: string | null;
}

export function BrandMark({ name, size, logoUrl }: BrandMarkProps) {
  const initial = name.charAt(0).toUpperCase() || "?";
  const dim = size ? { width: size, height: size } : undefined;

  if (!logoUrl) {
    return (
      <span className="brand-mark fallback" style={dim}>
        {initial}
      </span>
    );
  }

  const src =
    logoUrl.startsWith("http") || logoUrl.startsWith("/")
      ? logoUrl
      : `/${logoUrl}`;

  return (
    <span className="brand-mark" style={dim}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(event) => {
          const parent = event.currentTarget.parentElement;
          if (!parent) return;
          parent.classList.add("fallback");
          parent.textContent = initial;
        }}
      />
    </span>
  );
}
