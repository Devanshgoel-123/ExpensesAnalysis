"use client";

const BRAND_DOMAIN: Record<string, string> = {
  Swiggy: "swiggy.com",
  Bistro: "swiggy.com",
  MakeMyTrip: "makemytrip.com",
  Rapido: "rapido.bike",
  Zepto: "zeptonow.com",
  District: "district.in",
};

interface BrandMarkProps {
  name: string;
  size?: number;
}

export function BrandMark({ name, size = 18 }: BrandMarkProps) {
  const domain = BRAND_DOMAIN[name];
  const initial = name.charAt(0).toUpperCase();

  if (!domain) {
    return (
      <span className="brand-mark fallback" style={{ width: size, height: size }}>
        {initial}
      </span>
    );
  }

  const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

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
      />
    </span>
  );
}
