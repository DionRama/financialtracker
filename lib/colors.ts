export const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hashColor(seed: string): string {
  const h = hash32(seed) % 360;
  return hslToHex(h, 65, 0.55);
}

export function pickUniqueColor(used: ReadonlyArray<string>, seed: string): string {
  const usedSet = new Set(used.map((c) => c.toLowerCase()));
  const free = CATEGORY_COLORS.find((c) => !usedSet.has(c.toLowerCase()));
  if (free) return free;
  let color = hashColor(seed);
  let salt = 0;
  while (usedSet.has(color.toLowerCase()) && salt < 64) {
    salt += 1;
    color = hashColor(`${seed}-${salt}`);
  }
  return color;
}
