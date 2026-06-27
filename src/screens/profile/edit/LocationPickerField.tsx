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
import { LocationSearchItem } from '@/types/api';

type Props = {
  value: string;
  onSelect: (address: string) => void;
  sem: SemanticTheme;
};

function isoToFlag(iso?: string | null): string {
  if (!iso || iso.length !== 2) return '🌍';
  const pts = [...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

export const LocationPickerField = memo(function LocationPickerField({ value, onSelect, sem }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        setIsLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addresses = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (addresses.length > 0) {
        const a = addresses.find((addr) => addr.city && addr.city.trim().length > 0) ?? addresses[0];
        const city = a.city ?? a.subregion ?? a.district ?? '';
        const region = a.region ?? '';
        const country = a.country ?? '';
        const formatted = [city, region, country].filter(Boolean).join(', ');
        onSelect(formatted);
        setExpanded(false);
        setQuery('');
        setResults([]);
      } else {
        setError('Could not determine your location.');
      }
    } catch {
      setError('Failed to get current location.');
    } finally {
      setIsLocating(false);
    }
  }, [onSelect]);

  // ─── City selection ──────────────────────────────────────────────────
  const handleSelectCity = useCallback(
    (item: LocationSearchItem) => {
      const formatted = item.display_name || [item.city, item.region, item.country_name].filter(Boolean).join(', ');
      onSelect(formatted);
      setExpanded(false);
      setQuery('');
      setResults([]);
      setError(null);
    },
    [onSelect],
  );

  // ─── Collapsed state: show current value as a button ─────────────────
  if (!expanded) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        className="flex-row items-center rounded-xl px-3 py-3 border"
        style={{
          backgroundColor: sem.surfaceMuted,
          borderColor: sem.border,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Address: ${value || 'Not set'}`}
      >
        <Ionicons name="location-outline" size={16} color={sem.textMuted} style={{ marginRight: 8 }} />
        <Text
          className="flex-1 text-sm"
          style={{ color: value ? sem.textPrimary : sem.textMuted }}
          numberOfLines={1}
        >
          {value || 'Set your location'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={sem.textMuted} />
      </Pressable>
    );
  }

  // ─── Expanded state: GPS + search ────────────────────────────────────
  return (
    <View
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: sem.surfaceMuted, borderColor: sem.border }}
    >
      {/* Current value indicator */}
      {value ? (
        <View className="flex-row items-center px-3 py-2" style={{ backgroundColor: sem.accentSoft }}>
          <Ionicons name="location" size={14} color={sem.accent} style={{ marginRight: 6 }} />
          <Text className="flex-1 text-xs font-medium" style={{ color: sem.accent }} numberOfLines={1}>
            {value}
          </Text>
          <Pressable onPress={() => setExpanded(false)} accessibilityLabel="Close">
            <Ionicons name="close" size={16} color={sem.accent} />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center justify-end px-3 pt-2">
          <Pressable onPress={() => setExpanded(false)} accessibilityLabel="Close">
            <Ionicons name="close" size={16} color={sem.textMuted} />
          </Pressable>
        </View>
      )}

      {/* GPS button */}
      <Pressable
        onPress={handleUseCurrentLocation}
        disabled={isLocating}
        className="flex-row items-center px-3 py-3 mx-3 mt-2 rounded-xl border"
        style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}08` }}
        accessibilityRole="button"
        accessibilityLabel="Use current location"
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name="locate" size={16} color={colors.primary} style={{ marginRight: 8 }} />
        )}
        <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
          {isLocating ? 'Getting location…' : 'Use current location'}
        </Text>
      </Pressable>

      {/* Divider */}
      <View className="flex-row items-center px-3 my-2">
        <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
        <Text className="text-xs mx-2" style={{ color: sem.textMuted }}>or search</Text>
        <View className="flex-1 h-px" style={{ backgroundColor: sem.border }} />
      </View>

      {/* Search input */}
      <View
        className="flex-row items-center mx-3 mb-2 rounded-xl px-3 py-2.5 border"
        style={{ backgroundColor: sem.surface, borderColor: sem.border }}
      >
        <Ionicons name="search" size={15} color={sem.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setError(null);
          }}
          placeholder="Search city..."
          placeholderTextColor={sem.textMuted}
          autoCapitalize="words"
          autoFocus
          className="flex-1 text-sm"
          style={{ color: sem.textPrimary, padding: 0 }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={16} color={sem.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Loading */}
      {isSearching && (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 8 }} />
      )}

      {/* No results */}
      {!isSearching && query.length >= 2 && results.length === 0 && (
        <Text className="text-xs text-center py-2" style={{ color: sem.textMuted }}>
          No cities found
        </Text>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <View className="mx-3 mb-2 rounded-xl overflow-hidden border" style={{ borderColor: sem.border }}>
          {results.slice(0, 5).map((item, idx) => (
            <Pressable
              key={item.place_id}
              onPress={() => handleSelectCity(item)}
              className="flex-row items-center px-3 py-2.5"
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
      {error && (
        <Text className="text-xs text-center py-2 px-3" style={{ color: sem.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
});
