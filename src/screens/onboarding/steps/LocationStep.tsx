import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { searchLocations } from '@/api/locationsApi';
import { fetchProfileLocation, updateLocation } from '@/api/profileApi';
import { colors, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LocationSearchItem, ProfileLocationResponse } from '@/types/api';

type Props = { onComplete: () => Promise<void>; isCompleted: boolean };
// 'saved' = show existing saved location; 'choice' = GPS/manual picker; 'locating' = GPS in progress; 'manual' = search UI
type Mode = 'saved' | 'choice' | 'locating' | 'manual';

function isoToFlag(iso?: string | null): string {
  if (!iso || iso.length !== 2) return '🌍';
  const pts = [...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

export default function LocationStep({ onComplete, isCompleted }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const [mode, setMode] = useState<Mode>(isCompleted ? 'saved' : 'choice');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedLocation, setSavedLocation] = useState<ProfileLocationResponse | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(isCompleted);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LocationSearchItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved location on mount when step is already completed
  useEffect(() => {
    if (!isCompleted) return;
    setIsLoadingSaved(true);
    fetchProfileLocation()
      .then((loc) => {
        setSavedLocation(loc);
        setMode('saved');
      })
      .catch(() => {
        // Could not load saved location — fall back to choice mode
        setMode('choice');
      })
      .finally(() => setIsLoadingSaved(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchLocations(query);
        setResults(res.items);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleGps = useCallback(async () => {
    setMode('locating');
    setError(null);
    setIsSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please search for your city manually.');
        setMode('manual');
        setIsSubmitting(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let geocoded: { country_code?: string; country_name?: string; city?: string; region?: string; formatted_address?: string } = {};
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses.length > 0) {
          // Scan all results for one that has an explicit city; fallback to first result
          const a = addresses.find((addr) => addr.city && addr.city.trim().length > 0) ?? addresses[0];

          // Robust city extraction: city first, then name (sometimes contains city on iOS when locality is null),
          // then subregion (county), then district (neighborhood) as last resort
          let city = a.city ?? undefined;
          if (!city && a.name) {
            const name = a.name.trim();
            // Use name if it looks like a place name (no house numbers, not a street address)
            if (name.length > 1 && name.length < 40 && !/\d/.test(name) && !/street|road|avenue|drive|lane|way|close|court|place/i.test(name)) {
              city = name;
            }
          }
          if (!city && a.subregion && a.subregion !== a.region) {
            city = a.subregion;
          }
          if (!city && a.district && a.district !== a.region) {
            city = a.district;
          }
          const country = a.country ?? undefined;
          const region = a.region ?? undefined;
          geocoded = {
            country_code: a.isoCountryCode ?? undefined,
            country_name: country,
            city,
            region,
            formatted_address: [city, region, country].filter(Boolean).join(', '),
          };
        }
      } catch { /* Reverse geocode failed — send coordinates only */ }
      await updateLocation({ location_source: 'GPS', latitude, longitude, ...geocoded });
      await onComplete();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? t('onboarding.location.gpsError'));
      setMode('manual');
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete]);

  const handleManualSubmit = useCallback(async () => {
    if (!selectedPlace) { setError(t('onboarding.location.selectCityError')); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await updateLocation({ location_source: 'MANUAL', place_id: selectedPlace.place_id });
      await onComplete();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? t('onboarding.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPlace, onComplete]);

  const resetToChoice = useCallback(() => {
    setMode('choice');
    setQuery('');
    setResults([]);
    setSelectedPlace(null);
    setError(null);
  }, []);

  if (isLoadingSaved) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (mode === 'locating') {
    return (
      <View style={styles.center}>
        <View style={[styles.locatingCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: th.textSecondary }]}>Getting your location…</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: th.text }]}>{t('onboarding.location.title')}</Text>
        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          {t('onboarding.location.subtitle')}
        </Text>

        {/* ── Saved location mode ────────────────────────────────────────── */}
        {mode === 'saved' && savedLocation != null && (
          <>
            <View style={[styles.savedCard, { backgroundColor: th.surface, borderColor: colors.primary }]}>
              <View style={styles.savedCardRow}>
                <Text style={styles.savedFlag}>{isoToFlag(savedLocation.country_code)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.savedLabel, { color: th.textMuted }]}>{t('onboarding.location.currentLocation')}</Text>
                  <Text style={[styles.savedLocation, { color: th.text }]}>
                    {savedLocation.formatted_address ??
                      ([savedLocation.city, savedLocation.region, savedLocation.country_name]
                        .filter(Boolean)
                        .join(', ') ||
                      t('onboarding.location.locationSaved'))}
                  </Text>
                  <Text style={[styles.savedSource, { color: th.textMuted }]}>
                    {savedLocation.location_source === 'GPS' ? '📍 GPS' : '🔍 Manual search'}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => onComplete()}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{t('onboarding.location.continue')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manualBtn, { backgroundColor: th.surface, borderColor: th.border, marginTop: 12 }]}
              onPress={() => setMode('choice')}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={th.text} style={{ opacity: 0.6 }} />
              <Text style={[styles.manualBtnText, { color: th.text }]}>{t('onboarding.location.changeLocation')}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'choice' && (
          <>
            <TouchableOpacity
              style={[styles.gpsBtn, { backgroundColor: colors.primary }]}
              onPress={handleGps}
              activeOpacity={0.85}
            >
              <Ionicons name="locate" size={20} color="#FFFFFF" />
              <Text style={styles.gpsBtnText}>{t('onboarding.location.useCurrentLocation')}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: th.border }]} />
              <Text style={[styles.dividerText, { color: th.textMuted }]}>{t('onboarding.location.or')}</Text>
              <View style={[styles.divider, { backgroundColor: th.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.manualBtn, { backgroundColor: th.surface, borderColor: th.border }]}
              onPress={() => setMode('manual')}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={18} color={th.text} style={{ opacity: 0.6 }} />
              <Text style={[styles.manualBtnText, { color: th.text }]}>{t('onboarding.location.searchManually')}</Text>
            </TouchableOpacity>

            {error != null && <Text style={styles.errorText}>{error}</Text>}
          </>
        )}

        {mode === 'manual' && (
          <>
            <View style={[styles.searchBox, { backgroundColor: th.backgroundElement, borderColor: th.border }]}>
              <Ionicons name="search" size={17} color={th.text} style={{ opacity: 0.45 }} />
              <TextInput
                style={[styles.searchInput, { color: th.text }]}
                value={query}
                onChangeText={(t) => { setQuery(t); setSelectedPlace(null); }}
                placeholder={t('onboarding.location.searchPlaceholder')}
                placeholderTextColor={th.textMuted}
                autoCapitalize="words"
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSelectedPlace(null); }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={th.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {isSearching && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

            {!isSearching && query.length >= 2 && results.length === 0 && (
              <Text style={[styles.emptyText, { color: th.textMuted }]}>{t('onboarding.location.noResults')}</Text>
            )}

            {results.length > 0 && (
              <View style={[styles.resultsList, { backgroundColor: th.surface, borderColor: th.border }]}>
                {results.map((item, idx) => {
                  const sel = selectedPlace?.place_id === item.place_id;
                  return (
                    <TouchableOpacity
                      key={item.place_id}
                      style={[
                        styles.resultRow,
                        sel && { backgroundColor: th.backgroundSelected },
                        idx < results.length - 1 && [styles.resultRowBorder, { borderBottomColor: th.border }],
                      ]}
                      onPress={() => setSelectedPlace(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.resultFlag}>{isoToFlag(item.country_code)}</Text>
                      <View style={styles.resultTextCol}>
                        <Text style={[styles.resultCity, { color: th.text }]}>{item.city}</Text>
                        <Text style={[styles.resultMeta, { color: th.textSecondary }]}>
                          {[item.region, item.country_name].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                      {sel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {selectedPlace != null && (
              <View style={[styles.selectedBox, { backgroundColor: th.backgroundSelected, borderColor: colors.primary }]}>
                <Text style={styles.selectedFlag}>{isoToFlag(selectedPlace.country_code)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedLabel, { color: th.textMuted }]}>Selected city</Text>
                  <Text style={[styles.selectedText, { color: th.text }]}>{selectedPlace.display_name}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            )}

            {error != null && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, (!selectedPlace || isSubmitting) && styles.btnDisabled]}
              onPress={handleManualSubmit}
              disabled={!selectedPlace || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Continue</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={resetToChoice} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={14} color={th.textMuted} />
              <Text style={[styles.backLinkText, { color: th.textMuted }]}>Back to location options</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  locatingCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: { fontSize: 15 },

  title: { fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.4, marginTop: spacing.xs },
  subtitle: { fontSize: 15, marginBottom: spacing.xl, lineHeight: 22 },

  gpsBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  gpsBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },

  manualBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
  },
  manualBtnText: { fontSize: 15, fontWeight: '600' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { fontSize: 16, flex: 1, padding: 0 },

  emptyText: { fontSize: 14, textAlign: 'center', marginTop: spacing.md },

  resultsList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  resultRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  resultFlag: { fontSize: 22 },
  resultTextCol: { flex: 1 },
  resultCity: { fontSize: 15, fontWeight: '600' },
  resultMeta: { fontSize: 13, marginTop: 2 },

  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedFlag: { fontSize: 26 },
  selectedLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  selectedText: { fontSize: 15, fontWeight: '600' },

  errorText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    gap: 5,
  },
  backLinkText: { fontSize: 13 },

  savedCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  savedFlag: { fontSize: 28, marginRight: 4 },
  savedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  savedLocation: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  savedSource: { fontSize: 12 },
});
