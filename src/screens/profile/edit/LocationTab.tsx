import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';

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
}: Props) {
  const [pendingPayload, setPendingPayload] = useState<LocationPayload | null>(null);
  const [pendingDisplay, setPendingDisplay] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setLocationError('Location permission denied.');
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
      setPendingDisplay(formatted || 'Current location');
      setQuery('');
      setResults([]);
    } catch {
      setLocationError('Failed to get current location.');
    } finally {
      setIsLocating(false);
    }
  }, []);

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
        <SectionTitle title="Your Location" sem={sem} />

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
            className="flex-1 text-sm font-medium"
            style={{ color: hasPending ? sem.accent : displayedAddress ? sem.textPrimary : sem.textMuted }}
            numberOfLines={2}
          >
            {displayedAddress ?? 'No location set'}
          </Text>
          {hasPending && (
            <View
              className="rounded-full px-2 py-0.5 ml-2"
              style={{ backgroundColor: sem.accent }}
            >
              <Text className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>
                Pending
              </Text>
            </View>
          )}
        </View>

        {/* GPS button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={isLocating || isSaving}
          className="flex-row items-center justify-center rounded-xl py-3 mb-3 border"
          style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}12` }}
          accessibilityRole="button"
          accessibilityLabel="Use current GPS location"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="locate" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          )}
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            {isLocating ? 'Getting location…' : 'Use current GPS location'}
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center my-3">
          <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
          <Text className="text-xs mx-3" style={{ color: sem.textMuted }}>
            or search a city
          </Text>
          <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
        </View>

        {/* Search input */}
        <View
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
            placeholder="Search city…"
            placeholderTextColor={sem.textMuted}
            autoCapitalize="words"
            className="flex-1 text-sm"
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
          <Text className="text-xs text-center py-2" style={{ color: sem.textMuted }}>
            No cities found
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
                  <Text className="text-sm font-medium" style={{ color: sem.textPrimary }}>
                    {item.city}
                  </Text>
                  <Text className="text-xs" style={{ color: sem.textMuted }}>
                    {[item.region, item.country_name].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Error */}
        {locationError && (
          <Text className="text-xs text-center py-1 px-3" style={{ color: sem.danger }}>
            {locationError}
          </Text>
        )}

        {/* Helper */}
        <Text className="text-xs mt-1 mb-4" style={{ color: sem.textMuted }}>
          Your location helps show you closer matches and appear in local searches.
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
          accessibilityLabel="Save location"
        >
          {({ pressed }) =>
            isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className="text-base font-bold"
                style={{
                  color: hasPending ? '#FFFFFF' : sem.textMuted,
                  opacity: pressed ? 0.8 : 1,
                }}
              >
                Save Location
              </Text>
            )
          }
        </Pressable>
      </SectionCard>
    </View>
  );
});
