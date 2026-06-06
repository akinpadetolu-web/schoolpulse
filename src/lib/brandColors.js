import { base44 } from '@/api/base44Client';

/**
 * Convert a hex color (#rrggbb) to HSL string "H S% L%" for CSS variables.
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply brand colors to CSS variables on :root.
 * primaryColor and secondaryColor are hex strings.
 */
export function applyBrandColors(primaryColor, secondaryColor) {
  if (!primaryColor && !secondaryColor) return;
  const root = document.documentElement;
  if (primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    const hsl = hexToHsl(primaryColor);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--chart-1', hsl);
  }
  if (secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor)) {
    const hsl = hexToHsl(secondaryColor);
    root.style.setProperty('--secondary', hsl);
    root.style.setProperty('--accent', hsl);
  }
}

/**
 * Clear brand color overrides (revert to CSS defaults).
 */
export function clearBrandColors() {
  const root = document.documentElement;
  ['--primary', '--ring', '--sidebar-primary', '--chart-1', '--secondary', '--accent'].forEach(v => {
    root.style.removeProperty(v);
  });
}

/**
 * Load a school's brand colors from DB and apply them.
 */
export async function loadAndApplySchoolBrandColors(schoolId) {
  if (!schoolId) return;
  try {
    const results = await base44.entities.School.filter({ id: schoolId });
    const school = (results || [])[0];
    if (school?.primaryColor || school?.secondaryColor) {
      applyBrandColors(school.primaryColor, school.secondaryColor);
    }
  } catch (e) {
    console.warn('Brand colors: failed to load', e?.message);
  }
}