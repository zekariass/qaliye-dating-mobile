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

import { COUNTRIES, type CountryOption, getCountryName } from '@/constants/countries';

type Props = {
  value: string | null;       // ISO 3166-1 alpha-2 code or null
  onChange: (code: string) => void;
  placeholder?: string;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  surfaceColor?: string;
  surfaceMutedColor?: string;
};

export function CountrySelectPicker({
  value,
  onChange,
  placeholder = 'Select country…',
  accentColor = '#8A2CFF',
  textColor = '#1B1340',
  mutedColor = '#9CA3AF',
  borderColor = '#E9DDF8',
  surfaceColor = '#FFFFFF',
  surfaceMutedColor = '#F5F0FA',
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

  const displayLabel = value ? getCountryName(value) : placeholder;
  const hasValue = !!value;

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  return (
    <>
      {/* ── Trigger ── */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Nationality: ${displayLabel}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: surfaceMutedColor,
          gap: 8,
        }}
      >
        <Ionicons name="flag-outline" size={16} color={mutedColor} />
        <Text
          style={{ flex: 1, fontSize: 16, color: hasValue ? textColor : mutedColor }}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={mutedColor} />
      </Pressable>

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
              Select Nationality
            </Text>
            <Pressable onPress={() => { setOpen(false); setSearch(''); }} hitSlop={8} accessibilityLabel="Close">
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
              autoFocus
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
                const sel = item.code === value;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.code)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                      backgroundColor: sel ? `${accentColor}10` : 'transparent',
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: mutedColor, width: 28 }}>
                      {item.code}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? accentColor : textColor }}>
                        {item.name}
                      </Text>
                      {item.nativeName !== item.name && (
                        <Text style={{ fontSize: 12, color: mutedColor, marginTop: 1 }}>
                          {item.nativeName}
                        </Text>
                      )}
                    </View>
                    {sel && <Ionicons name="checkmark" size={18} color={accentColor} />}
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
