export const TRACKED_PEOPLE = [
  "Deepan",
  "Mehak",
  "Tanisha",
  "Tapasya",
] as const;

export type TrackedPerson = (typeof TRACKED_PEOPLE)[number];
