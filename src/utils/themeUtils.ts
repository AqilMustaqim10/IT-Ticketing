/**
 * @file themeUtils.ts
 * @description Theme color utilities, color resolvers, CSS variables, and badge helpers
 * for multi-business unit customized branding and theme colors.
 */

import React from 'react';
import { BusinessUnit, BusinessUnitCode } from '../types';

export interface BUThemeDefinition {
  primary: string;
  accent: string;
  gradient: string;
  bgLight: string;
  bgSoft: string;
  border: string;
  textColor: string;
  badgeStyle: React.CSSProperties;
  badgePillStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  buttonHoverStyle: React.CSSProperties;
  bannerStyle: React.CSSProperties;
  indicatorDotStyle: React.CSSProperties;
  bannerTheme: string;
  themeName: string;
  code: string;
  name: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  category: 'Corporate' | 'Tech & Cyber' | 'Hospitality & Dining' | 'Healthcare & Nature' | 'Luxury & Premium' | 'Modern Slate';
  primary: string;
  accent: string;
  gradient: string;
  bannerTheme: 'blue' | 'amber' | 'emerald' | 'purple' | 'slate' | 'indigo' | 'rose' | 'teal' | 'sky' | 'orange' | 'cyan';
  description: string;
  recommendedFor?: string;
}

/**
 * Built-in default theme color definitions for known Business Units.
 */
export const BU_DEFAULT_THEMES: Record<string, {
  primary: string;
  accent: string;
  gradient: string;
  themeName: string;
  bannerTheme: 'blue' | 'amber' | 'emerald' | 'purple' | 'slate' | 'indigo' | 'rose' | 'teal' | 'sky' | 'orange' | 'cyan';
}> = {
  CCEC: {
    primary: '#2563eb', // Royal Blue
    accent: '#4f46e5',  // Indigo
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)',
    themeName: 'Royal Blue (CCEC)',
    bannerTheme: 'blue',
  },
  FNB: {
    primary: '#d97706', // Amber / Gold
    accent: '#ea580c',  // Orange
    gradient: 'linear-gradient(135deg, #b45309 0%, #c2410c 100%)',
    themeName: 'Culinary Amber (F&B)',
    bannerTheme: 'amber',
  },
  HOTEL: {
    primary: '#0d9488', // Teal / Jade
    accent: '#059669',  // Emerald
    gradient: 'linear-gradient(135deg, #0f766e 0%, #047857 100%)',
    themeName: 'Hospitality Teal (Hotel)',
    bannerTheme: 'teal',
  },
  KLBS: {
    primary: '#0284c7', // Sky Blue / Cyan
    accent: '#0369a1',  // Deep Sky
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    themeName: 'Cyber Sky (KLBS)',
    bannerTheme: 'sky',
  },
  KLW: {
    primary: '#059669', // Emerald Green
    accent: '#047857',  // Forest Green
    gradient: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
    themeName: 'Clinical Emerald (KLW)',
    bannerTheme: 'emerald',
  },
  'UOA HQ': {
    primary: '#7c3aed', // Executive Purple
    accent: '#6d28d9',  // Deep Violet
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    themeName: 'Executive Purple (UOA HQ)',
    bannerTheme: 'purple',
  },
  UOA_HQ: {
    primary: '#7c3aed',
    accent: '#6d28d9',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    themeName: 'Executive Purple (UOA HQ)',
    bannerTheme: 'purple',
  },
};

/**
 * Pre-defined theme palettes with rich presets available for admin selection.
 */
export const BU_COLOR_PALETTES: ThemePreset[] = [
  // 1. Corporate & Enterprise
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    category: 'Corporate',
    primary: '#2563eb',
    accent: '#4f46e5',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)',
    bannerTheme: 'blue',
    description: 'High-trust, professional enterprise corporate blue tone.',
    recommendedFor: 'CCEC Conventions & General Business Units',
  },
  {
    id: 'oxford-navy',
    name: 'Oxford Navy',
    category: 'Corporate',
    primary: '#1e3a8a',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #172554 0%, #1e40af 100%)',
    bannerTheme: 'blue',
    description: 'Authoritative deep navy blue for executive operations.',
    recommendedFor: 'Financial & Governance Hubs',
  },
  {
    id: 'deep-indigo',
    name: 'Deep Indigo',
    category: 'Corporate',
    primary: '#4f46e5',
    accent: '#3730a3',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
    bannerTheme: 'indigo',
    description: 'Polished digital indigo with crisp optical balance.',
    recommendedFor: 'IT Operations & Infrastructure',
  },
  {
    id: 'steel-slate',
    name: 'Steel Slate',
    category: 'Corporate',
    primary: '#475569',
    accent: '#334155',
    gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
    bannerTheme: 'slate',
    description: 'Clean architectural industrial slate tone.',
    recommendedFor: 'Property Management & Facilities',
  },

  // 2. Tech & Cyber
  {
    id: 'azure-sky',
    name: 'Azure Sky',
    category: 'Tech & Cyber',
    primary: '#0284c7',
    accent: '#0369a1',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    bannerTheme: 'sky',
    description: 'Clear, modern high-altitude sky blue with agile tech feel.',
    recommendedFor: 'KLBS Bangsar South Tech Hub',
  },
  {
    id: 'nordic-cyan',
    name: 'Nordic Cyan',
    category: 'Tech & Cyber',
    primary: '#0891b2',
    accent: '#0e7490',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #155e75 100%)',
    bannerTheme: 'cyan',
    description: 'Contemporary cyan with sharp data-driven clarity.',
    recommendedFor: 'Network Operations & Smart Systems',
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    category: 'Tech & Cyber',
    primary: '#8b5cf6',
    accent: '#6d28d9',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    bannerTheme: 'purple',
    description: 'Futuristic vibrant purple with strong visual engagement.',
    recommendedFor: 'Innovation & Digital Transformation',
  },

  // 3. Hospitality & Dining
  {
    id: 'culinary-amber',
    name: 'Culinary Amber',
    category: 'Hospitality & Dining',
    primary: '#d97706',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #b45309 0%, #c2410c 100%)',
    bannerTheme: 'amber',
    description: 'Warm golden amber inspired by fine dining and culinary arts.',
    recommendedFor: 'F&B Hospitality & Restaurant Systems',
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    category: 'Hospitality & Dining',
    primary: '#ea580c',
    accent: '#c2410c',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)',
    bannerTheme: 'orange',
    description: 'Vibrant flame orange conveying energy, food & beverage.',
    recommendedFor: 'Cafes, Catering & Banquet Services',
  },
  {
    id: 'tuscan-terracotta',
    name: 'Tuscan Terracotta',
    category: 'Hospitality & Dining',
    primary: '#c2410c',
    accent: '#9a3412',
    gradient: 'linear-gradient(135deg, #9a3412 0%, #7c2d12 100%)',
    bannerTheme: 'orange',
    description: 'Earthy, rich terracotta brick tones for artisan dining.',
    recommendedFor: 'Artisan Outlets & Lounge Spaces',
  },

  // 4. Healthcare & Nature
  {
    id: 'hospitality-teal',
    name: 'Hospitality Teal',
    category: 'Healthcare & Nature',
    primary: '#0d9488',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #047857 100%)',
    bannerTheme: 'teal',
    description: 'Serene sea teal balance conveying luxury hospitality & peace.',
    recommendedFor: 'Resort & Hotel Concierge Desk',
  },
  {
    id: 'healthcare-emerald',
    name: 'Clinical Emerald',
    category: 'Healthcare & Nature',
    primary: '#059669',
    accent: '#047857',
    gradient: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
    bannerTheme: 'emerald',
    description: 'Calming medicinal green promoting health, vitality and care.',
    recommendedFor: 'KLW Healthcare Suites & Clinical IT',
  },
  {
    id: 'botanical-pine',
    name: 'Botanical Pine',
    category: 'Healthcare & Nature',
    primary: '#15803d',
    accent: '#166534',
    gradient: 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
    bannerTheme: 'emerald',
    description: 'Organic deep pine green for eco, landscape, and sustainability.',
    recommendedFor: 'Green Properties & Wellness Centers',
  },
  {
    id: 'fresh-mint',
    name: 'Aqua Mint',
    category: 'Healthcare & Nature',
    primary: '#0f766e',
    accent: '#0284c7',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
    bannerTheme: 'teal',
    description: 'Crisp, restorative aqua mint gradient for wellness hubs.',
    recommendedFor: 'Rehabilitation & Spa Centers',
  },

  // 5. Luxury & Premium
  {
    id: 'executive-purple',
    name: 'Executive Purple',
    category: 'Luxury & Premium',
    primary: '#7c3aed',
    accent: '#6d28d9',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    bannerTheme: 'purple',
    description: 'Prestige royal purple representing group leadership.',
    recommendedFor: 'UOA HQ Group Management & Executive Board',
  },
  {
    id: 'vibrant-rose',
    name: 'Vibrant Rose',
    category: 'Luxury & Premium',
    primary: '#e11d48',
    accent: '#be123c',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)',
    bannerTheme: 'rose',
    description: 'Bold magenta rose capturing high fashion & luxury retail.',
    recommendedFor: 'Premium Retail, Events & VIP Relations',
  },
  {
    id: 'bordeaux-ruby',
    name: 'Bordeaux Ruby',
    category: 'Luxury & Premium',
    primary: '#9f1239',
    accent: '#881337',
    gradient: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
    bannerTheme: 'rose',
    description: 'Deep sophisticated burgundy wine tone with rich character.',
    recommendedFor: 'Private Members Club & Executive Suites',
  },
  {
    id: 'amethyst-violet',
    name: 'Amethyst Violet',
    category: 'Luxury & Premium',
    primary: '#9333ea',
    accent: '#7e22ce',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #581c87 100%)',
    bannerTheme: 'purple',
    description: 'Regal jewel-tone violet for distinctive distinction.',
    recommendedFor: 'Creative Studios & Special Projects',
  },

  // 6. Modern Slate & Dark
  {
    id: 'carbon-obsidian',
    name: 'Obsidian Slate',
    category: 'Modern Slate',
    primary: '#334155',
    accent: '#1e293b',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    bannerTheme: 'slate',
    description: 'Minimalist high-contrast obsidian dark aesthetic.',
    recommendedFor: 'Security Operations & Data Centers',
  },
  {
    id: 'titanium-zinc',
    name: 'Titanium Zinc',
    category: 'Modern Slate',
    primary: '#52525b',
    accent: '#3f3f46',
    gradient: 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)',
    bannerTheme: 'slate',
    description: 'Monochrome industrial precision zinc color palette.',
    recommendedFor: 'Engineering, Hardware & Maintenance',
  },
];

/**
 * Converts a hex color string (e.g. #2563eb) to rgba(r, g, b, alpha).
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(37, 99, 235, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Resolves the complete Theme Definition for any Business Unit.
 * Fallbacks gracefully if the BU is undefined, or if a custom theme color was assigned.
 */
export function getBUTheme(
  buOrIdOrCode: BusinessUnit | string | undefined | null,
  allBusinessUnits?: BusinessUnit[]
): BUThemeDefinition {
  let matchedBU: BusinessUnit | undefined;

  if (typeof buOrIdOrCode === 'object' && buOrIdOrCode !== null) {
    matchedBU = buOrIdOrCode;
  } else if (typeof buOrIdOrCode === 'string' && allBusinessUnits) {
    matchedBU = allBusinessUnits.find(
      (b) =>
        b.id === buOrIdOrCode ||
        b.code === buOrIdOrCode ||
        b.code.toUpperCase() === buOrIdOrCode.toUpperCase()
    );
  }

  const code = (matchedBU?.code || (typeof buOrIdOrCode === 'string' ? buOrIdOrCode : 'CCEC')).toUpperCase();
  const defaultDef = BU_DEFAULT_THEMES[code] || BU_DEFAULT_THEMES['CCEC'];

  // Resolve custom branding primaryColor, BU.themeColor, or default fallback
  const primary =
    matchedBU?.branding?.primaryColor ||
    matchedBU?.themeColor ||
    defaultDef.primary;

  const accent =
    matchedBU?.branding?.accentColor ||
    defaultDef.accent;

  const gradient =
    matchedBU?.branding?.accentGradient?.startsWith('linear-gradient')
      ? matchedBU.branding.accentGradient
      : `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;

  const bannerTheme = matchedBU?.branding?.bannerTheme || defaultDef.bannerTheme || 'blue';
  const name = matchedBU?.name || defaultDef.themeName;

  const bgLight = hexToRgba(primary, 0.08);
  const bgSoft = hexToRgba(primary, 0.15);
  const border = hexToRgba(primary, 0.28);
  const textColor = primary;

  return {
    primary,
    accent,
    gradient,
    bgLight,
    bgSoft,
    border,
    textColor,
    bannerTheme,
    themeName: defaultDef.themeName || `${code} Theme`,
    code,
    name,
    badgeStyle: {
      backgroundColor: bgLight,
      color: primary,
      borderColor: border,
      borderWidth: '1px',
      borderStyle: 'solid',
    },
    badgePillStyle: {
      backgroundColor: bgLight,
      color: primary,
    },
    buttonStyle: {
      backgroundColor: primary,
      color: '#ffffff',
    },
    buttonHoverStyle: {
      backgroundColor: accent,
      color: '#ffffff',
    },
    bannerStyle: {
      background: gradient,
      color: '#ffffff',
    },
    indicatorDotStyle: {
      backgroundColor: primary,
    },
  };
}

/**
 * Helper to get primary hex color for a given BU code or id.
 */
export function getBUPrimaryColor(
  buOrIdOrCode: BusinessUnit | string | undefined | null,
  allBUs?: BusinessUnit[]
): string {
  return getBUTheme(buOrIdOrCode, allBUs).primary;
}

/**
 * Validates whether a given string is a valid 3 or 6 digit hex code.
 */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
}

/**
 * Calculates relative luminance of a hex color (0 to 1).
 */
export function getLuminance(hex: string): number {
  if (!isValidHex(hex)) return 0.5;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Returns '#ffffff' or '#0f172a' depending on which has higher contrast with the given hex.
 */
export function getContrastTextColor(hex: string): '#ffffff' | '#0f172a' {
  return getLuminance(hex) > 0.45 ? '#0f172a' : '#ffffff';
}

/**
 * Generates an intelligently harmonized accent color (analogous/deepened) from a primary hex.
 */
export function generateHarmoniousAccent(primaryHex: string): string {
  if (!isValidHex(primaryHex)) return '#4f46e5';
  let clean = primaryHex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  let r = parseInt(clean.substring(0, 2), 16);
  let g = parseInt(clean.substring(2, 4), 16);
  let b = parseInt(clean.substring(4, 6), 16);

  // Shift hue slightly and adjust depth to create an elegant pairing
  r = Math.min(255, Math.max(0, Math.round(r * 0.85 + (b > g ? 20 : -10))));
  g = Math.min(255, Math.max(0, Math.round(g * 0.85 + (r > b ? 15 : -10))));
  b = Math.min(255, Math.max(0, Math.round(b * 0.85 + (g > r ? 25 : 10))));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

