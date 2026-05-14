// apps/bot/src/intents/constants.ts
export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const MONTH_ALIASES: Array<{ month: number; aliases: string[] }> = [
  { month: 1, aliases: ["januari", "jan"] },
  { month: 2, aliases: ["februari", "feb"] },
  { month: 3, aliases: ["maret", "mar"] },
  { month: 4, aliases: ["april", "apr"] },
  { month: 5, aliases: ["mei"] },
  { month: 6, aliases: ["juni", "jun"] },
  { month: 7, aliases: ["juli", "jul"] },
  { month: 8, aliases: ["agustus", "agu", "ags", "aug"] },
  { month: 9, aliases: ["september", "sep", "sept"] },
  { month: 10, aliases: ["oktober", "okt", "oct"] },
  { month: 11, aliases: ["november", "nov"] },
  { month: 12, aliases: ["desember", "des", "dec"] },
];
