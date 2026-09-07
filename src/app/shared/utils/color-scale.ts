/**
 * Builds an indicative 50–900 tint/shade ramp from one hex input.
 *
 * "Indicative" is the operative word: the exact mapping from these three user
 * colours onto the extracted theme's own colour slots is not settled, so the
 * wizard labels this preview as approximate rather than as what will be
 * written. See README §"Open questions".
 */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export interface ScaleStop {
  readonly step: number;
  readonly css: string;
  readonly onLight: boolean;
}

export function colorScale(hex: string): readonly ScaleStop[] {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return [];
  }
  return SCALE_STEPS.map((step) => {
    const ratio = step < 500 ? ((500 - step) / 500) * 0.86 : -((step - 500) / 500) * 0.6;
    const mix = (channel: number): number =>
      Math.round(ratio > 0 ? channel + (255 - channel) * ratio : channel * (1 + ratio));
    return {
      step,
      css: `rgb(${mix(rgb.r)} ${mix(rgb.g)} ${mix(rgb.b)})`,
      onLight: step < 400,
    };
  });
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}
