/**
 * Lightweight Zustand store for the matchmaking preference wizard.
 *
 * Holds the draft preference state across the three-step wizard:
 *   Step 1 → Basic Preferences
 *   Step 2 → Additional Preferences (compatibility dimensions)
 *   Step 3 → Review & Save
 *
 * Cleared once preferences are saved to the API.
 */
import { create } from 'zustand';

import type {
    HasChildrenPreference,
    MatchmakingPreferencesDto,
    WantsChildrenPreference,
} from '@/types/matchmaking';

export type WizardBasicDraft = {
  min_age: number;
  max_age: number;
  /** null = no height preference */
  min_height_cm: number | null;
  max_height_cm: number | null;
  specific_country_codes: string[];
  religion_preferences: string[];
  education_levels: string[];
  marital_statuses: string[];
  has_children_preference: HasChildrenPreference;
  wants_children_preference: WantsChildrenPreference;
};

export type WizardAdditionalDraft = {
  smoking_preferences: string[];
  drinking_preferences: string[];
  marriage_timeline: string | null;
  long_distance_relationship: string | null;
  family_involvement: string | null;
  religion_important: string | null;
  willing_to_relocate: string | null;
  /** Free-text notes for the matchmaker — never machine-read by backend. */
  user_notes: string | null;
};

export type MatchmakingWizardState = {
  basic: WizardBasicDraft;
  additional: WizardAdditionalDraft;
  setBasic: (draft: Partial<WizardBasicDraft>) => void;
  setAdditional: (draft: Partial<WizardAdditionalDraft>) => void;
  /** Hydrate the full wizard state from existing saved preferences. */
  hydrateFromApi: (prefs: MatchmakingPreferencesDto) => void;
  reset: () => void;
};

const DEFAULT_BASIC: WizardBasicDraft = {
  min_age: 25,
  max_age: 35,
  min_height_cm: null,
  max_height_cm: null,
  specific_country_codes: [],
  religion_preferences: [],
  education_levels: [],
  marital_statuses: [],
  has_children_preference: 'any',
  wants_children_preference: 'any',
};

const DEFAULT_ADDITIONAL: WizardAdditionalDraft = {
  smoking_preferences: [],
  drinking_preferences: [],
  marriage_timeline: null,
  long_distance_relationship: null,
  family_involvement: null,
  religion_important: null,
  willing_to_relocate: null,
  user_notes: null,
};

export const useMatchmakingWizardStore = create<MatchmakingWizardState>((set) => ({
  basic: { ...DEFAULT_BASIC },
  additional: { ...DEFAULT_ADDITIONAL },

  setBasic: (draft) =>
    set((s) => ({ basic: { ...s.basic, ...draft } })),

  setAdditional: (draft) =>
    set((s) => ({ additional: { ...s.additional, ...draft } })),

  hydrateFromApi: (prefs) =>
    set({
      basic: {
        min_age: prefs.min_age ?? DEFAULT_BASIC.min_age,
        max_age: prefs.max_age ?? DEFAULT_BASIC.max_age,
        min_height_cm: prefs.min_height_cm ?? null,
        max_height_cm: prefs.max_height_cm ?? null,
        specific_country_codes: prefs.specific_country_codes ?? [],
        religion_preferences: prefs.religion_preferences ?? [],
        education_levels: prefs.education_levels ?? [],
        marital_statuses: prefs.marital_statuses ?? [],
        has_children_preference: prefs.has_children_preference ?? 'any',
        wants_children_preference: prefs.wants_children_preference ?? 'any',
      },
      additional: {
        smoking_preferences: prefs.smoking_preferences ?? [],
        drinking_preferences: prefs.drinking_preferences ?? [],
        marriage_timeline: prefs.marriage_timeline ?? null,
        long_distance_relationship: prefs.long_distance_relationship ?? null,
        family_involvement: prefs.family_involvement ?? null,
        religion_important: prefs.religion_important ?? null,
        willing_to_relocate: prefs.willing_to_relocate ?? null,
        user_notes: prefs.user_notes ?? null,
      },
    }),

  reset: () =>
    set({ basic: { ...DEFAULT_BASIC }, additional: { ...DEFAULT_ADDITIONAL } }),
}));
