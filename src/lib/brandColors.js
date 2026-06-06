import { base44 } from '@/api/base44Client';

/** Convert hex (#rrggbb) to "H S% L%" for CSS HSL variable format */
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString(h, s, l) {
  return `${h} ${s}% ${l}%`;
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

/**
 * Apply a full brand colors object (school record fields) to :root.
 *
 * KEY INSIGHT: Tailwind sidebar tokens use HSL format, e.g.:
 *   bg-sidebar  → hsl(var(--sidebar-background))
 *   bg-sidebar-primary → hsl(var(--sidebar-primary))
 *   hover:bg-sidebar-accent → hsl(var(--sidebar-accent))
 *
 * So we MUST write HSL strings (not hex) into these variables.
 */
export function applyBrandColors(colors = {}) {
  const root = document.documentElement;
  const get = (key) => (colors[key] && /^#[0-9a-fA-F]{6}$/.test(colors[key])) ? colors[key] : COLOR_DEFAULTS[key];

  function setProp(prop, value) {
    root.style.setProperty(prop, value);
  }

  // ── SIDEBAR ────────────────────────────────────────────────────────────────
  // These variables are consumed by Tailwind as hsl(var(...))
  const sbBg = hexToHsl(get('sidebarBgColor'));
  const sbText = hexToHsl(get('sidebarTextColor'));
  const sbActive = hexToHsl(get('sidebarActiveColor'));
  const sbActiveFg = hexToHsl(get('primaryBtnTextColor'));

  if (sbBg) {
    setProp('--sidebar-background', hslString(sbBg.h, sbBg.s, sbBg.l));
    // sidebar-accent = slightly lighter than sidebar-bg for hover states
    const accentL = Math.min(sbBg.l + 8, 95);
    setProp('--sidebar-accent', hslString(sbBg.h, sbBg.s, accentL));
    // sidebar-border = slightly lighter variant
    const borderL = Math.min(sbBg.l + 5, 90);
    setProp('--sidebar-border', hslString(sbBg.h, sbBg.s, borderL));
  }
  if (sbText) {
    setProp('--sidebar-foreground', hslString(sbText.h, sbText.s, sbText.l));
    setProp('--sidebar-accent-foreground', hslString(sbText.h, sbText.s, sbText.l));
  }
  if (sbActive) {
    setProp('--sidebar-primary', hslString(sbActive.h, sbActive.s, sbActive.l));
    setProp('--sidebar-ring', hslString(sbActive.h, sbActive.s, sbActive.l));
  }
  if (sbActiveFg) {
    setProp('--sidebar-primary-foreground', hslString(sbActiveFg.h, sbActiveFg.s, sbActiveFg.l));
  }

  // ── PRIMARY / RING ─────────────────────────────────────────────────────────
  const primary = hexToHsl(get('primaryColor'));
  if (primary) {
    const ps = hslString(primary.h, primary.s, primary.l);
    setProp('--primary', ps);
    setProp('--ring', ps);
    setProp('--chart-1', ps);
  }
  setProp('--brand-primary', get('primaryColor'));

  // ── SECONDARY ──────────────────────────────────────────────────────────────
  const secondary = hexToHsl(get('secondaryColor'));
  if (secondary) {
    setProp('--secondary', hslString(secondary.h, secondary.s, secondary.l));
    const secFg = hexToHsl(get('secondaryBtnTextColor'));
    if (secFg) setProp('--secondary-foreground', hslString(secFg.h, secFg.s, secFg.l));
  }
  setProp('--brand-secondary', get('secondaryColor'));

  // ── BODY / BACKGROUND ──────────────────────────────────────────────────────
  const bodyBg = hexToHsl(get('bodyBgColor'));
  if (bodyBg) {
    setProp('--background', hslString(bodyBg.h, bodyBg.s, bodyBg.l));
  }
  setProp('--body-bg', get('bodyBgColor'));

  // ── CARD ───────────────────────────────────────────────────────────────────
  const cardBg = hexToHsl(get('cardBgColor'));
  if (cardBg) {
    setProp('--card', hslString(cardBg.h, cardBg.s, cardBg.l));
    setProp('--popover', hslString(cardBg.h, cardBg.s, cardBg.l));
  }
  setProp('--card-bg', get('cardBgColor'));

  // ── FOREGROUND / TEXT ──────────────────────────────────────────────────────
  const bodyText = hexToHsl(get('bodyTextColor'));
  if (bodyText) {
    setProp('--foreground', hslString(bodyText.h, bodyText.s, bodyText.l));
    setProp('--popover-foreground', hslString(bodyText.h, bodyText.s, bodyText.l));
  }
  const headingText = hexToHsl(get('headingTextColor'));
  if (headingText) {
    setProp('--card-foreground', hslString(headingText.h, headingText.s, headingText.l));
  }
  setProp('--body-text', get('bodyTextColor'));
  setProp('--heading-color', get('headingTextColor'));
  setProp('--link-color', get('linkColor'));

  // ── TOPBAR ─────────────────────────────────────────────────────────────────
  setProp('--topbar-bg', get('topbarBgColor'));
  setProp('--topbar-text', get('topbarTextColor'));

  // ── BORDER / INPUT ─────────────────────────────────────────────────────────
  const border = hexToHsl(get('borderColor'));
  if (border) {
    setProp('--border', hslString(border.h, border.s, border.l));
    setProp('--input', hslString(border.h, border.s, border.l));
  }
  setProp('--border-color', get('borderColor'));

  // ── BUTTONS (raw hex for inline-style consumers) ───────────────────────────
  setProp('--btn-primary-bg', get('primaryBtnColor'));
  setProp('--btn-primary-text', get('primaryBtnTextColor'));
  setProp('--btn-secondary-bg', get('secondaryBtnColor'));
  setProp('--btn-secondary-text', get('secondaryBtnTextColor'));

  // ── TABLES ─────────────────────────────────────────────────────────────────
  setProp('--table-header-bg', get('tableHeaderBgColor'));
  setProp('--table-header-text', get('tableHeaderTextColor'));

  // ── STATUS ─────────────────────────────────────────────────────────────────
  setProp('--badge-color', get('badgeColor'));
  setProp('--brand-success', get('successColor'));
  setProp('--brand-warning', get('warningColor'));
  const danger = hexToHsl(get('dangerColor'));
  if (danger) {
    setProp('--destructive', hslString(danger.h, danger.s, danger.l));
  }
  setProp('--brand-danger', get('dangerColor'));
}

/** Remove all brand color overrides, reverting to stylesheet defaults */
export function clearBrandColors() {
  const root = document.documentElement;
  [
    '--primary', '--ring', '--chart-1', '--brand-primary',
    '--secondary', '--secondary-foreground', '--brand-secondary',
    '--sidebar-background', '--sidebar-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
    '--topbar-bg', '--topbar-text',
    '--background', '--card', '--card-foreground', '--popover', '--popover-foreground',
    '--body-bg', '--card-bg',
    '--foreground', '--body-text', '--heading-color', '--link-color',
    '--border', '--input', '--border-color',
    '--btn-primary-bg', '--btn-primary-text', '--btn-secondary-bg', '--btn-secondary-text',
    '--table-header-bg', '--table-header-text',
    '--badge-color', '--brand-success', '--brand-warning', '--destructive', '--brand-danger',
  ].forEach(p => root.style.removeProperty(p));
}

/** Load a school record from DB and apply its brand colors */
export async function loadAndApplySchoolBrandColors(schoolId) {
  if (!schoolId) return;
  try {
    const results = await base44.entities.School.filter({ id: schoolId });
    const school = (results || [])[0];
    if (school) applyBrandColors(school);
  } catch (e) {
    console.warn('[BrandColors] Failed to load:', e?.message);
  }
}