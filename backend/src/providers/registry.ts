export function resolveProviderLogo(input: {
  logoUrl?: string | null;
  websiteDomain?: string | null;
  name: string;
}): { logoUrl: string | null; fallbackInitial: string } {
  if (input.logoUrl) {
    return {
      logoUrl: input.logoUrl,
      fallbackInitial: input.name.charAt(0).toUpperCase(),
    };
  }
  return {
    logoUrl: null,
    fallbackInitial: input.name.charAt(0).toUpperCase() || "?",
  };
}
