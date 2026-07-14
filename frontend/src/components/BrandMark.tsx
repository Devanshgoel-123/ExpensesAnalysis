"use client";

interface BrandMarkProps {
  name: string;
  size?: number;
  logoUrl?: string | null;
}

export function BrandMark({ name, size = 18, logoUrl }: BrandMarkProps) {
  const initial = name.charAt(0).toUpperCase() || "?";

  if (!logoUrl) {
    return (
      <span className="brand-mark fallback" style={{ width: size, height: size }}>
        {initial}
      </span>
    );
  }

  const src = logoUrl.startsWith("http") || logoUrl.startsWith("/")
    ? logoUrl
    : `/${logoUrl}`;

  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(event) => {
          const parent = event.currentTarget.parentElement;
          if (parent) {
            parent.classList.add("fallback");
            parent.textContent = initial;
          }
        }}
      />
    </span>
  );
}
