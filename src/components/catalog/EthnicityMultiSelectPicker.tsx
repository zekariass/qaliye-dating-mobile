import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COUNTRIES } from '@/constants/countries';
import { useEthnicitiesCatalog } from '@/hooks/catalog/useEthnicitiesCatalog';
import type { EthnicityOption } from '@/types/catalog';

const MAX_ETHNICITIES = 10;

const QUICK_COUNTRIES = [
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
];

type SepItem = { isSeparator: true; id: string };
type ListItem = EthnicityOption | SepItem;

function isSeparator(item: ListItem): item is SepItem {
  return 'isSeparator' in item;
}

function buildList(items: EthnicityOption[]): ListItem[] {
  const habesha = items.filter((i) => i.country_code === 'ET' || i.country_code === 'ER');
  const rest = items.filter((i) => i.country_code !== 'ET' && i.country_code !== 'ER');
  if (habesha.length > 0 && rest.length > 0) {
    return [...habesha, { isSeparator: true as const, id: '__sep__' }, ...rest];
  }
  return items;
}

type Props = {
  selected: EthnicityOption[];
  onChange: (items: EthnicityOption[]) => void;
  placeholder?: string;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  surfaceColor?: string;
};

export function EthnicityMultiSelectPicker({
  selected,
  onChange,
  placeholder = 'Select ethnicities…',
  accentColor = '#8A2CFF',
  textColor = '#1B1340',
  mutedColor = '#9CA3AF',
  borderColor = '#E9DDF8',
  surfaceColor = '#FFFFFF',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const { bottom, top } = useSafeAreaInsets();

  const { data, isLoading } = useEthnicitiesCatalog({
    countryCode: countryFilter ?? undefined,
    q: search || undefined,
    limit: 200,
  });

  const rawItems = useMemo(() => data?.items ?? [], [data]);
  const listItems = useMemo<ListItem[]>(() => buildList(rawItems), [rawItems]);

  const isSelected = useCallback(
    (item: EthnicityOption) => selected.some((s) => s.id === item.id),
    [selected],
  );

  const handleToggle = useCallback(
    (item: EthnicityOption) => {
      if (isSelected(item)) {
        onChange(selected.filter((s) => s.id !== item.id));
      } else if (selected.length < MAX_ETHNICITIES) {
        onChange([...selected, item]);
      }
    },
    [isSelected, onChange, selected],
  );

  const handleRemove = useCallback(
    (id: string) => onChange(selected.filter((s) => s.id !== id)),
    [onChange, selected],
  );

  const selectedCountryName = useMemo(() => {
    if (countryFilter === null) return null;
    const quick = QUICK_COUNTRIES.find((c) => c.code === countryFilter);
    if (quick) return `${quick.flag} ${quick.name}`;
    return COUNTRIES.find((c) => c.code === countryFilter)?.name ?? countryFilter;
  }, [countryFilter]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  const displayLabel = selected.length > 0
    ? selected.map((s) => s.name).join(', ')
    : placeholder;

  const inputBg = `${accentColor}12`;
  const isPickerDisabled = countryFilter === null;

  return (
    <>
      {/* ── Country selector row ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {QUICK_COUNTRIES.map((c) => {
          const active = countryFilter === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => setCountryFilter(active ? null : c.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: active ? accentColor : borderColor,
                backgroundColor: active ? accentColor + '18' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14 }}>{c.flag}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: active ? accentColor : mutedColor }}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => { setCountrySearch(''); setCountryModalOpen(true); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: (countryFilter && !QUICK_COUNTRIES.some((c) => c.code === countryFilter)) ? accentColor : borderColor,
            backgroundColor: (countryFilter && !QUICK_COUNTRIES.some((c) => c.code === countryFilter)) ? accentColor + '18' : 'transparent',
          }}
        >
          <Ionicons name="globe-outline" size={13} color={mutedColor} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: mutedColor }}>
            {(countryFilter && !QUICK_COUNTRIES.some((c) => c.code === countryFilter))
              ? (COUNTRIES.find((c) => c.code === countryFilter)?.name ?? 'Other')
              : 'Other…'}
          </Text>
        </Pressable>
      </View>

      {/* ── Trigger ── */}
      <Pressable
        onPress={() => !isPickerDisabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ethnicities: ${displayLabel}`}
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
          opacity: isPickerDisabled ? 0.4 : 1,
        }}
      >
        <Ionicons name="people-outline" size={16} color={accentColor} />
        <Text style={{ flex: 1, fontSize: 14, color: selected.length > 0 ? textColor : mutedColor }} numberOfLines={1}>
          {isPickerDisabled ? 'Select a country first' : displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={mutedColor} />
      </Pressable>

      {/* ── Selected chips ── */}
      {selected.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {selected.map((item) => (
            <View
              key={item.id}
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
              <Text style={{ fontSize: 12, fontWeight: '600', color: accentColor }}>{item.name}</Text>
              <Pressable onPress={() => handleRemove(item.id)} accessibilityLabel={`Remove ${item.name}`} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={accentColor} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* ── Ethnicity picker modal ── */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: surfaceColor, paddingTop: top }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: textColor }}>Select Ethnicities</Text>
              {selectedCountryName && (
                <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{selectedCountryName}</Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: mutedColor }}>{selected.length}/{MAX_ETHNICITIES}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="checkmark-circle" size={28} color={accentColor} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, borderWidth: 1, borderColor, borderRadius: 10, backgroundColor: inputBg, gap: 8 }}>
            <Ionicons name="search-outline" size={16} color={mutedColor} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: textColor }}
              placeholder="Search ethnicities…"
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
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : rawItems.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={40} color={mutedColor} />
              <Text style={{ color: mutedColor, fontSize: 14 }}>No ethnicities found</Text>
            </View>
          ) : (
            <FlatList
              data={listItems}
              keyExtractor={(item) => (isSeparator(item) ? item.id : item.id)}
              contentContainerStyle={{ paddingBottom: bottom + 16 }}
              renderItem={({ item }) => {
                if (isSeparator(item)) {
                  return (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Other Countries
                      </Text>
                    </View>
                  );
                }
                const sel = isSelected(item);
                const disabled = !sel && selected.length >= MAX_ETHNICITIES;
                return (
                  <Pressable
                    onPress={() => handleToggle(item)}
                    disabled={disabled}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, opacity: disabled ? 0.4 : 1, gap: 12 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>{item.name}</Text>
                      {item.region && (
                        <Text style={{ fontSize: 12, color: mutedColor, marginTop: 1 }}>{item.region}</Text>
                      )}
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: sel ? 0 : 1.5, borderColor, backgroundColor: sel ? accentColor : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* ── Country picker modal (Other) ── */}
      <Modal visible={countryModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCountryModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: surfaceColor, paddingTop: top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: textColor }}>Select Country</Text>
            <Pressable onPress={() => setCountryModalOpen(false)} hitSlop={8}>
              <Ionicons name="close-circle" size={28} color={mutedColor} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, borderWidth: 1, borderColor, borderRadius: 10, backgroundColor: inputBg, gap: 8 }}>
            <Ionicons name="search-outline" size={16} color={mutedColor} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: textColor }}
              placeholder="Search countries…"
              placeholderTextColor={mutedColor}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(c) => c.code}
            contentContainerStyle={{ paddingBottom: bottom + 16 }}
            renderItem={({ item }) => {
              const active = countryFilter === item.code;
              return (
                <Pressable
                  onPress={() => { setCountryFilter(item.code); setCountryModalOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: borderColor, gap: 12, backgroundColor: active ? accentColor + '12' : 'transparent' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: mutedColor, width: 28 }}>{item.code}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: textColor }}>{item.name}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}
