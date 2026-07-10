import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COUNTRIES, type CountryOption } from '@/constants/countries';

type Props = {
  selected: string[];       // ISO 3166-1 alpha-2 codes
  onChange: (codes: string[]) => void;
  maxSelection?: number;
  placeholder?: string;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  surfaceColor?: string;
};

export function CountryMultiSelectPicker({
  selected,
  onChange,
  maxSelection = 50,
  placeholder = 'Select countries…',
  accentColor = '#8A2CFF',
  textColor = '#1B1340',
  mutedColor = '#9CA3AF',
  borderColor = '#E9DDF8',
  surfaceColor = '#FFFFFF',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { top, bottom } = useSafeAreaInsets();

  const filtered = useMemo<CountryOption[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  const isSelected = useCallback((code: string) => selected.includes(code), [selected]);

  const handleToggle = useCallback(
    (code: string) => {
      if (isSelected(code)) {
        onChange(selected.filter((c) => c !== code));
      } else if (selected.length < maxSelection) {
        onChange([...selected, code]);
      }
    },
    [isSelected, maxSelection, onChange, selected],
  );

  const handleRemove = useCallback(
    (code: string) => onChange(selected.filter((c) => c !== code)),
    [onChange, selected],
  );

  const selectedCountries = useMemo(
    () => COUNTRIES.filter((c) => selected.includes(c.code)),
    [selected],
  );

  const displayLabel =
    selectedCountries.length > 0
      ? selectedCountries.map((c) => c.name).join(', ')
      : placeholder;

  return (
    <>
      {/* ── Trigger ── */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Countries: ${displayLabel}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: surfaceColor,
          gap: 8,
        }}
      >
        <Ionicons name="globe-outline" size={16} color={accentColor} />
        <Text
          style={{ flex: 1, fontSize: 14, color: selectedCountries.length > 0 ? textColor : mutedColor }}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={mutedColor} />
      </Pressable>

      {/* ── Selected chips ── */}
      {selectedCountries.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {selectedCountries.map((country) => (
            <View
              key={country.code}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: accentColor + '18',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: accentColor }}>
                {country.name}
              </Text>
              <Pressable
                onPress={() => handleRemove(country.code)}
                accessibilityLabel={`Remove ${country.name}`}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={14} color={accentColor} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* ── Modal ── */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: surfaceColor, paddingTop: top }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
              gap: 12,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: textColor }}>
              Select Countries
            </Text>
            {maxSelection < 50 && (
              <Text style={{ fontSize: 12, color: mutedColor }}>
                {selected.length}/{maxSelection}
              </Text>
            )}
            <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="checkmark-circle" size={28} color={accentColor} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: 12,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor,
              borderRadius: 10,
              backgroundColor: `${accentColor}12`,
              gap: 8,
            }}
          >
            <Ionicons name="search-outline" size={16} color={mutedColor} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: textColor }}
              placeholder="Search countries…"
              placeholderTextColor={mutedColor}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={mutedColor} />
              </Pressable>
            )}
          </View>

          {/* List */}
          {filtered.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="globe-outline" size={40} color={mutedColor} />
              <Text style={{ color: mutedColor, fontSize: 14 }}>No countries found</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ paddingBottom: bottom + 16 }}
              renderItem={({ item }) => {
                const sel = isSelected(item.code);
                const disabled = !sel && selected.length >= maxSelection;
                return (
                  <Pressable
                    onPress={() => handleToggle(item.code)}
                    disabled={disabled}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                      opacity: disabled ? 0.4 : 1,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: mutedColor, width: 28 }}>
                      {item.code}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>
                        {item.name}
                      </Text>
                      {item.nativeName !== item.name && (
                        <Text style={{ fontSize: 12, color: mutedColor, marginTop: 1 }}>
                          {item.nativeName}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: sel ? 0 : 1.5,
                        borderColor,
                        backgroundColor: sel ? accentColor : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {sel && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}
