"use client";

interface BrandMarkProps {
  name: string;
  size?: number;
  logoUrl?: string | null;
}

// Generate a consistent color based on the name
function getColorForName(name: string): string {
  const colors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
    "#F8B739", // Orange
    "#52B788", // Green
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function BrandMark({ name, size, logoUrl }: BrandMarkProps) {
  const initial = name.charAt(0).toUpperCase() || "?";
  const dim = size ? { width: size, height: size } : undefined;
  const brandColor = getColorForName(name);

  if (!logoUrl) {
    return (
      <span
        className="brand-mark fallback"
        style={{
          ...dim,
          backgroundColor: brandColor,
        }}
      >
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
          parent.style.backgroundColor = brandColor;
          parent.textContent = initial;
        }}
      />
    </span>
  );
}
