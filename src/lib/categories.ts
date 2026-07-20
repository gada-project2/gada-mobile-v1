import type { Category } from "./api/types";

export interface CategoryMeta {
  key: Category;
  label: string; // sentence case
  /** Flat banner / accent colour (saturated; pairs with white content). */
  color: string;
  /** Ionicons glyph name. */
  icon: string;
}

// Category accent palette. Deliberately avoids brand emerald (primary actions)
// and coral (live/now only) so those stay reserved per the brand rules.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  CONCERT: { key: "CONCERT", label: "Concert", color: "#7C5CFC", icon: "musical-notes" },
  CONFERENCE: { key: "CONFERENCE", label: "Conference", color: "#2F7DD1", icon: "easel" },
  PARTY: { key: "PARTY", label: "Party", color: "#E8568A", icon: "sparkles" },
  MEETING: { key: "MEETING", label: "Meeting", color: "#475569", icon: "people" },
  VOLUNTEERING: { key: "VOLUNTEERING", label: "Volunteering", color: "#2FAE66", icon: "heart" },
  OTHER: { key: "OTHER", label: "Other", color: "#6B7280", icon: "calendar" },
};

// Ordered list for the category chip row.
export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORY_META.CONCERT,
  CATEGORY_META.CONFERENCE,
  CATEGORY_META.PARTY,
  CATEGORY_META.MEETING,
  CATEGORY_META.VOLUNTEERING,
  CATEGORY_META.OTHER,
];

export function categoryMeta(category: string | undefined): CategoryMeta {
  if (category && category in CATEGORY_META) {
    return CATEGORY_META[category as Category];
  }
  return CATEGORY_META.OTHER;
}
