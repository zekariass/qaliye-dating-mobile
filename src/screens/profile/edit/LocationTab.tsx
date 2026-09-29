import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { searchLocations } from '@/api/locationsApi';
import { type SemanticTheme } from '@/constants/semantic-colors';
import { colors } from '@/constants/theme';
import type { GpsLocationPayload, LocationSearchItem, ManualLocationPayload } from '@/types/api';
import { SectionCard, SectionTitle } from './FormComponents';

type LocationPayload = GpsLocationPayload | ManualLocationPayload;

type Props = {
  currentFormattedAddress: string | null;
  sem: SemanticTheme;
  onSave: (payload: LocationPayload) => Promise<void>;
  isSaving: boolean;
  scrollRef: React.RefObject<ScrollView | null>;
};

function isoToFlag(iso?: string | null): string {
  if (!iso || iso.length !== 2) return '🌍';
  const pts = [...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

export const LocationTab = memo(function LocationTab({
  currentFormattedAddress,
  sem,
  onSave,
  isSaving,
  scrollRef,
}: Props) {
  const { t } = useTranslation();
  const [pendingPayload, setPendingPayload] = useState<LocationPayload | null>(null);
  const [pendingDisplay, setPendingDisplay] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputWrapRef = useRef<View>(null);

  // ─── Debounced city search ───────────────────────────────────────────
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ─── GPS handler ─────────────────────────────────────────────────────
  const handleUseCurrentLocation = useCallback(async () => {
    setLocationError(null);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(t('profile.location.permissionDenied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const addr = geocoded.find((a) => a.city?.trim()) ?? geocoded[0];
      const city = addr?.city ?? addr?.subregion ?? addr?.district ?? undefined;
      const region = addr?.region ?? undefined;
      const countryName = addr?.country ?? undefined;
      const countryCode = addr?.isoCountryCode ?? undefined;
      const formatted = [city, region, countryName].filter(Boolean).join(', ');

      const gpsPayload: GpsLocationPayload = {
        location_source: 'GPS',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        city,
        region,
        country_name: countryName,
        country_code: countryCode,
        formatted_address: formatted || undefined,
      };

      setPendingPayload(gpsPayload);
      setPendingDisplay(formatted || t('profile.location.currentLocation'));
      setQuery('');
      setResults([]);
    } catch {
      setLocationError(t('profile.location.locateFailed'));
    } finally {
      setIsLocating(false);
    }
  }, [t]);

  // ─── Manual city selection ────────────────────────────────────────────
  const handleSelectCity = useCallback((item: LocationSearchItem) => {
    const display =
      item.display_name ||
      [item.city, item.region, item.country_name].filter(Boolean).join(', ');
    const manualPayload: ManualLocationPayload = {
      location_source: 'MANUAL',
      place_id: item.place_id,
    };
    setPendingPayload(manualPayload);
    setPendingDisplay(display);
    setQuery('');
    setResults([]);
    setLocationError(null);
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!pendingPayload) return;
    await onSave(pendingPayload);
    setPendingPayload(null);
    setPendingDisplay(null);
  }, [pendingPayload, onSave]);

  const displayedAddress = pendingDisplay ?? currentFormattedAddress ?? null;
  const hasPending = pendingPayload !== null;

  return (
    <View>
      <SectionCard sem={sem}>
        <SectionTitle title={t('profile.location.title')} sem={sem} />

        {/* Current / pending address chip */}
        <View
          className="flex-row items-center rounded-xl px-3 py-3 mb-4 border"
          style={{
            backgroundColor: hasPending ? sem.accentSoft : sem.surfaceMuted,
            borderColor: hasPending ? sem.accent : sem.border,
          }}
        >
          <Ionicons
            name="location"
            size={16}
            color={hasPending ? sem.accent : sem.textMuted}
            style={{ marginRight: 8 }}
          />
          <Text
            className="flex-1 text-base font-medium"
            style={{ color: hasPending ? sem.accent : displayedAddress ? sem.textPrimary : sem.textMuted }}
            numberOfLines={2}
          >
            {displayedAddress ?? t('profile.location.noLocation')}
          </Text>
          {hasPending && (
            <View
              className="rounded-full px-2 py-0.5 ml-2"
              style={{ backgroundColor: sem.accent }}
            >
              <Text className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                {t('profile.location.pending')}
              </Text>
            </View>
          )}
        </View>

        {/* Search input */}
        <View
          ref={searchInputWrapRef}
          className="flex-row items-center rounded-xl px-3 py-2.5 mb-2 border"
          style={{ backgroundColor: sem.surface, borderColor: sem.border }}
        >
          <Ionicons name="search" size={15} color={sem.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setLocationError(null);
            }}
            onFocus={() => {
              setTimeout(() => {
                searchInputWrapRef.current?.measureLayout(
                  scrollRef.current as any,
                  (_x, y) => {
                    scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
                  },
                  () => {},
                );
              }, 300);
            }}
            placeholder={t('profile.location.searchPlaceholder')}
            placeholderTextColor={sem.textMuted}
            autoCapitalize="words"
            className="flex-1 text-base"
            style={{ color: sem.textPrimary, padding: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={16} color={sem.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Search loading */}
        {isSearching && (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 6 }} />
        )}

        {/* No results */}
        {!isSearching && query.length >= 2 && results.length === 0 && (
          <Text className="text-sm text-center py-2" style={{ color: sem.textMuted }}>
            {t('profile.location.noResults')}
          </Text>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View
            className="rounded-xl overflow-hidden border mb-2"
            style={{ borderColor: sem.border }}
          >
            {results.slice(0, 5).map((item, idx) => (
              <Pressable
                key={item.place_id}
                onPress={() => handleSelectCity(item)}
                className="flex-row items-center px-3 py-3"
                style={{
                  backgroundColor: sem.surface,
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: sem.border,
                }}
                accessibilityRole="button"
                accessibilityLabel={item.display_name}
              >
                <Text style={{ marginRight: 8, fontSize: 16 }}>{isoToFlag(item.country_code)}</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium" style={{ color: sem.textPrimary }}>
                    {item.city}
                  </Text>
                  <Text className="text-sm" style={{ color: sem.textMuted }}>
                    {[item.region, item.country_name].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Divider */}
        <View className="flex-row items-center my-3">
          <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
          <Text className="text-sm mx-3" style={{ color: sem.textMuted }}>
            {t('profile.location.orGps')}
          </Text>
          <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
        </View>

        {/* GPS button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={isLocating || isSaving}
          className="flex-row items-center justify-center rounded-xl py-3 mb-3 border"
          style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}12` }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.location.useGps')}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="locate" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          )}
          <Text className="text-base font-semibold" style={{ color: colors.primary }}>
            {isLocating ? t('profile.location.locating') : t('profile.location.useGps')}
          </Text>
        </Pressable>

        {/* Error */}
        {locationError && (
          <Text className="text-sm text-center py-1 px-3" style={{ color: sem.danger }}>
            {locationError}
          </Text>
        )}

        {/* Helper */}
        <Text className="text-sm mt-1 mb-4" style={{ color: sem.textMuted }}>
          {t('profile.location.helper')}
        </Text>

        {/* Save button */}
        <Pressable
          onPress={isSaving ? undefined : handleSave}
          disabled={!hasPending || isSaving}
          className="rounded-full py-4 items-center"
          style={{
            backgroundColor: hasPending && !isSaving ? sem.accent : sem.surfaceMuted,
            opacity: !hasPending || isSaving ? 0.6 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.location.save')}
        >
          {({ pressed }) =>
            isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className="text-lg font-bold"
                style={{
                  color: hasPending ? '#FFFFFF' : sem.textMuted,
                  opacity: pressed ? 0.8 : 1,
                }}
              >
                {t('profile.location.save')}
              </Text>
            )
          }
        </Pressable>
      </SectionCard>
    </View>
  );
});
