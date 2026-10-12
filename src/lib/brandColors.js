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

/** Convert hex to "H S% L%" channels, for use inside hsl(var(--token)) */
function hexToHslChannels(hex) {
  const c = hexToHsl(hex);
  return c ? hslString(c.h, c.s, c.l) : null;
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Build a Tailwind-style tint/shade ramp (50–950) from one brand colour.
 * The chosen colour is anchored at the 500 step, so picking a mid-green
 * "Success" colour produces a coherent green scale for every shade the app
 * already uses (bg-emerald-100, text-emerald-700, …).
 */
function colorRamp(hex) {
  const c = hexToHsl(hex);
  if (!c) return null;
  const { h, s, l } = c;
  return {
    50:  hslString(h, clamp(Math.round(s * 0.85), 0, 100), 96),
    100: hslString(h, clamp(Math.round(s * 0.80), 0, 100), 91),
    200: hslString(h, clamp(Math.round(s * 0.75), 0, 100), 82),
    300: hslString(h, clamp(Math.round(s * 0.70), 0, 100), 72),
    400: hslString(h, clamp(Math.round(s * 0.80), 0, 100), 61),
    500: hslString(h, s, l),
    600: hslString(h, clamp(Math.round(s * 1.05), 0, 100), clamp(l - 9, 6, 100)),
    700: hslString(h, clamp(Math.round(s * 1.05), 0, 100), clamp(l - 17, 5, 100)),
    800: hslString(h, clamp(Math.round(s * 1.05), 0, 100), clamp(l - 23, 4, 100)),
    900: hslString(h, clamp(Math.round(s * 1.10), 0, 100), clamp(l - 28, 3, 100)),
    950: hslString(h, clamp(Math.round(s * 1.10), 0, 100), clamp(l - 33, 3, 100)),
  };
}

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Brand colour fields that drive a full status colour scale. */
const STATUS_RAMPS = ['success', 'warning', 'danger'];

/** Tokens written as HSL channel values and consumed via hsl(var(--token)). */
const HSL_TOKENS = [
  ['--link', 'linkColor'],
  ['--badge', 'badgeColor'],
  ['--btn-primary', 'primaryBtnColor'],
  ['--btn-primary-foreground', 'primaryBtnTextColor'],
  ['--btn-secondary', 'secondaryBtnColor'],
  ['--btn-secondary-foreground', 'secondaryBtnTextColor'],
  ['--table-header', 'tableHeaderBgColor'],
  ['--table-header-foreground', 'tableHeaderTextColor'],
];

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

  // ── STATUS SCALES (success / warning / danger) ─────────────────────────────
  // The emerald / amber / red Tailwind scales are remapped to these variables
  // in tailwind.config.js, so the Success, Warning and Danger picks recolour
  // every status badge, grade pill and alert across the app.
  STATUS_RAMPS.forEach(name => {
    const ramp = colorRamp(get(`${name}Color`));
    if (ramp) Object.entries(ramp).forEach(([step, v]) => setProp(`--${name}-${step}`, v));
  });

  // ── LINK / BADGE / BUTTONS / TABLES ────────────────────────────────────────
  HSL_TOKENS.forEach(([prop, key]) => {
    const v = hexToHslChannels(get(key));
    if (v) setProp(prop, v);
  });
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
    ...STATUS_RAMPS.flatMap(n => RAMP_STEPS.map(s => `--${n}-${s}`)),
    ...HSL_TOKENS.map(([prop]) => prop),
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