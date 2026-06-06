import { base44 } from '@/api/base44Client';

/** Convert hex (#rrggbb) to "H S% L%" for Tailwind CSS variable format */
function hexToHsl(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
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

// Default hex values for every color token
export const COLOR_DEFAULTS = {
  primaryColor:          '#4f6ef7',
  secondaryColor:        '#eef2ff',
  sidebarBgColor:        '#1a2035',
  sidebarTextColor:      '#c8d0e7',
  sidebarActiveColor:    '#4f6ef7',
  topbarBgColor:         '#ffffff',
  topbarTextColor:       '#1e293b',
  bodyBgColor:           '#f5f7fb',
  cardBgColor:           '#ffffff',
  primaryBtnColor:       '#4f6ef7',
  primaryBtnTextColor:   '#ffffff',
  secondaryBtnColor:     '#eef2ff',
  secondaryBtnTextColor: '#4f6ef7',
  headingTextColor:      '#0f172a',
  bodyTextColor:         '#475569',
  linkColor:             '#4f6ef7',
  borderColor:           '#e2e8f0',
  tableHeaderBgColor:    '#f1f5f9',
  tableHeaderTextColor:  '#475569',
  badgeColor:            '#4f6ef7',
  successColor:          '#22c55e',
  warningColor:          '#f59e0b',
  dangerColor:           '#ef4444',
};

// Map each school field to which CSS variables it drives
// Values can be hex (raw) or hsl (for tailwind tokens)
const COLOR_MAP = {
  primaryColor:          (hex) => {
    const hsl = hexToHsl(hex);
    if (!hsl) return {};
    return { '--primary': hsl, '--ring': hsl, '--sidebar-primary': hsl, '--chart-1': hsl };
  },
  secondaryColor:        (hex) => {
    const hsl = hexToHsl(hex);
    if (!hsl) return {};
    return { '--secondary': hsl };
  },
  sidebarBgColor:        (hex) => ({ '--sb-brand-bg': hex }),
  sidebarTextColor:      (hex) => ({ '--sb-brand-text': hex }),
  sidebarActiveColor:    (hex) => ({ '--sb-brand-active': hex }),
  topbarBgColor:         (hex) => ({ '--topbar-bg': hex }),
  topbarTextColor:       (hex) => ({ '--topbar-text': hex }),
  bodyBgColor:           (hex) => {
    const hsl = hexToHsl(hex);
    return hsl ? { '--background': hsl, '--body-bg': hex } : {};
  },
  cardBgColor:           (hex) => {
    const hsl = hexToHsl(hex);
    return hsl ? { '--card': hsl, '--card-bg': hex } : {};
  },
  primaryBtnColor:       (hex) => ({ '--btn-primary-bg': hex }),
  primaryBtnTextColor:   (hex) => ({ '--btn-primary-text': hex }),
  secondaryBtnColor:     (hex) => ({ '--btn-secondary-bg': hex }),
  secondaryBtnTextColor: (hex) => ({ '--btn-secondary-text': hex }),
  headingTextColor:      (hex) => ({ '--heading-color': hex }),
  bodyTextColor:         (hex) => {
    const hsl = hexToHsl(hex);
    return hsl ? { '--foreground': hsl, '--body-text': hex } : {};
  },
  linkColor:             (hex) => ({ '--link-color': hex }),
  borderColor:           (hex) => {
    const hsl = hexToHsl(hex);
    return hsl ? { '--border': hsl, '--input': hsl, '--border-color': hex } : {};
  },
  tableHeaderBgColor:    (hex) => ({ '--table-header-bg': hex }),
  tableHeaderTextColor:  (hex) => ({ '--table-header-text': hex }),
  badgeColor:            (hex) => ({ '--badge-color': hex }),
  successColor:          (hex) => ({ '--brand-success': hex }),
  warningColor:          (hex) => ({ '--brand-warning': hex }),
  dangerColor:           (hex) => {
    const hsl = hexToHsl(hex);
    return hsl ? { '--destructive': hsl, '--brand-danger': hex } : {};
  },
};

/** Apply a full brand colors object (school record fields) to :root */
export function applyBrandColors(colors = {}) {
  const root = document.documentElement;
  const allVars = {};
  Object.entries(COLOR_MAP).forEach(([field, mapper]) => {
    const hex = colors[field] || COLOR_DEFAULTS[field];
    if (hex) Object.assign(allVars, mapper(hex));
  });
  Object.entries(allVars).forEach(([prop, val]) => root.style.setProperty(prop, val));
}

/** Remove all brand color overrides, reverting to stylesheet defaults */
export function clearBrandColors() {
  const root = document.documentElement;
  const allProps = new Set();
  Object.values(COLOR_MAP).forEach(mapper => {
    Object.keys(mapper('#000000')).forEach(p => allProps.add(p));
  });
  allProps.forEach(p => root.style.removeProperty(p));
}

/** Load a school record from DB and apply its brand colors */
export async function loadAndApplySchoolBrandColors(schoolId) {
  if (!schoolId) return;
  try {
    const results = await base44.entities.School.filter({ id: schoolId });
    const school = (results || [])[0];
    if (school) applyBrandColors(school);
  } catch (e) {
    console.warn('Brand colors: failed to load', e?.message);
  }
}