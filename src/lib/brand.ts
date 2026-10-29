// Turn a workspace's #rrggbb brand colour into the "r g b" triplet Tailwind's
// `brand` colour reads from the --brand CSS variable.
export function brandRgb(hex: string | null | undefined) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '124 58 237';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || 'Bela';
