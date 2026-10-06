import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type SemanticTheme } from '@/constants/semantic-colors';
import i18n from '@/i18n';

// ─── Section Card ───────────────────────────────────────────────────────────────

type SectionCardProps = {
  children: React.ReactNode;
  sem: SemanticTheme;
};

export const SectionCard = memo(function SectionCard({ children, sem }: SectionCardProps) {
  return (
    <View
      className="rounded-3xl mb-6"
      style={{
        backgroundColor: sem.surface,
        shadowColor: sem.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
    >
      {children}
    </View>
  );
});

// ─── Section Title ──────────────────────────────────────────────────────────────

type SectionTitleProps = {
  title: string;
  sem: SemanticTheme;
};

export const SectionTitle = memo(function SectionTitle({ title, sem }: SectionTitleProps) {
  return (
    <Text
      className="font-bold"
      style={{ color: sem.textPrimary, fontSize: 20, marginBottom: 24 }}
    >
      {title}
    </Text>
  );
});

// ─── Row Pair (two-column layout) ───────────────────────────────────────────────

export function RowPair({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
      {children}
    </View>
  );
}

// ─── Labeled Field ──────────────────────────────────────────────────────────────

type LabeledFieldProps = {
  label: string;
  sem: SemanticTheme;
  children: React.ReactNode;
  flex?: boolean;
};

export function LabeledField({ label, sem, children, flex = true }: LabeledFieldProps) {
  return (
    <View style={flex ? { flex: 1 } : { width: '100%', marginBottom: 20 }}>
      <Text
        style={{ color: sem.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 10, letterSpacing: 0.2 }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

// ─── Text Input Field ───────────────────────────────────────────────────────────

type TextInputFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  sem: SemanticTheme;
  placeholder?: string;
  leftIcon?: string;
  editable?: boolean;
  rightElement?: React.ReactNode;
};

export const TextInputField = memo(function TextInputField({
  value,
  onChangeText,
  sem,
  placeholder,
  leftIcon,
  editable = true,
  rightElement,
}: TextInputFieldProps) {
  return (
    <View
      className="flex-row items-center rounded-2xl border"
      style={{
        backgroundColor: sem.surfaceMuted,
        borderColor: sem.border,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      {leftIcon && (
        leftIcon.startsWith('mci:') ? (
          <MaterialCommunityIcons name={leftIcon.slice(4) as any} size={20} color={sem.textMuted} style={{ marginRight: 12 }} />
        ) : /^[a-z-]+$/i.test(leftIcon) ? (
          <Ionicons name={leftIcon as any} size={20} color={sem.textMuted} style={{ marginRight: 12 }} />
        ) : (
          <Text style={{ fontSize: 20, marginRight: 12 }}>{leftIcon}</Text>
        )
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={sem.textMuted}
        editable={editable}
        className="flex-1"
        style={{ color: sem.textPrimary, padding: 0, fontSize: 17 }}
      />
      {rightElement}
    </View>
  );
});

// ─── Select Field ───────────────────────────────────────────────────────────────

type SelectFieldProps = {
  value: string;
  options: readonly string[];
  onSelect: (v: string) => void;
  sem: SemanticTheme;
  leftIcon?: string;
  placeholder?: string;
  // Optional display-only label transform; option values are unchanged.
  getOptionLabel?: (opt: string) => string;
};

export const SelectField = memo(function SelectField({
  value,
  options,
  onSelect,
  sem,
  leftIcon,
  placeholder,
  getOptionLabel,
}: SelectFieldProps) {
  const { t } = useTranslation();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const displayLabel = (opt: string) => getOptionLabel?.(opt) ?? opt;

  const handleSelect = useCallback((opt: string) => {
    onSelect(opt);
    setOpen(false);
  }, [onSelect]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-2xl border"
        style={{
          backgroundColor: sem.surfaceMuted,
          borderColor: sem.border,
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
        accessibilityRole="button"
        accessibilityLabel={placeholder ? t('profile.edit.selectA11y', { label: placeholder, value: value ? displayLabel(value) : value, defaultValue: '{{label}}: {{value}}' }) : (value ? displayLabel(value) : value)}
      >
        {leftIcon && (
          leftIcon.startsWith('mci:') ? (
            <MaterialCommunityIcons name={leftIcon.slice(4) as any} size={20} color={sem.textMuted} style={{ marginRight: 12 }} />
          ) : /^[a-z-]+$/i.test(leftIcon) ? (
            <Ionicons name={leftIcon as any} size={20} color={sem.textMuted} style={{ marginRight: 12 }} />
          ) : (
            <Text style={{ fontSize: 20, marginRight: 12 }}>{leftIcon}</Text>
          )
        )}
        <Text
          className="flex-1"
          style={{ color: value ? sem.textPrimary : sem.textMuted, fontSize: 17 }}
          numberOfLines={1}
        >
          {value ? displayLabel(value) : placeholder || t('profile.edit.select', 'Select')}
        </Text>
        <Ionicons name="chevron-down" size={20} color={sem.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[pickerStyles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                pickerStyles.sheet,
                {
                  backgroundColor: sem.surface,
                  paddingBottom: safeBottom,
                },
              ]}
            >
              {/* Drag handle */}
              <View style={[pickerStyles.handle, { backgroundColor: sem.border }]} />

              {/* Title */}
              <Text style={[pickerStyles.title, { color: sem.textPrimary }]}>
                {placeholder || t('profile.edit.selectOption', 'Select option')}
              </Text>

              {/* Options — always fully visible, no scrolling */}
              <View>
                {options.map((opt) => {
                  const isActive = opt === value;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => handleSelect(opt)}
                      style={[
                        pickerStyles.optionRow,
                        {
                          backgroundColor: isActive ? sem.accentSoft : 'transparent',
                        },
                      ]}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text
                        style={[
                          pickerStyles.optionText,
                          {
                            color: isActive ? sem.accent : sem.textPrimary,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {displayLabel(opt)}
                      </Text>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={22} color={sem.accent} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

// ─── Text Area Field ────────────────────────────────────────────────────────────

type TextAreaFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  sem: SemanticTheme;
  maxLength?: number;
  placeholder?: string;
};

export const TextAreaField = memo(function TextAreaField({
  value,
  onChangeText,
  sem,
  maxLength = 500,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <View
      className="rounded-2xl border"
      style={{
        backgroundColor: sem.surfaceMuted,
        borderColor: sem.border,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={sem.textMuted}
        multiline
        maxLength={maxLength}
        className="min-h-[80px]"
        style={{ color: sem.textPrimary, textAlignVertical: 'top', padding: 0, fontSize: 17 }}
      />
      <Text style={{ color: sem.textMuted, fontSize: 13, textAlign: 'right', marginTop: 8 }}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
});

// ─── Helper Text ────────────────────────────────────────────────────────────────

export function HelperText({ text, sem }: { text: string; sem: SemanticTheme }) {
  return (
    <Text className="text-[13px] mt-2 ml-1" style={{ color: sem.textMuted }}>
      {text}
    </Text>
  );
}

// ─── Chip Selector ──────────────────────────────────────────────────────────────

type ChipSelectorProps = {
  options: readonly string[];
  selected: string[];
  onToggle: (val: string) => void;
  sem: SemanticTheme;
};

export const ChipSelector = memo(function ChipSelector({
  options,
  selected,
  onToggle,
  sem,
}: ChipSelectorProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            className="rounded-full border"
            style={{
              backgroundColor: isActive ? sem.accentSoft : sem.surfaceMuted,
              borderColor: isActive ? sem.accent : sem.border,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={opt}
          >
            <Text
              style={{ color: isActive ? sem.accent : sem.textSecondary, fontSize: 15, fontWeight: '600' }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ─── Date Picker Field ──────────────────────────────────────────────────────────

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;
const MONTHS_FULL = MONTH_KEYS.map((m, i) => i18n.t(`profile.edit.months.${m}`, MONTH_NAMES_EN[i]));
const MONTHS_SHORT = MONTH_KEYS.map((m, i) => i18n.t(`profile.edit.monthsShort.${m}`, MONTH_SHORT_EN[i]));

function is18OrOlder(day: number, month: number, year: number): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eighteenthBirthday = new Date(year + 18, month, day);
  return eighteenthBirthday <= today;
}

function parseDisplayDate(display: string): { day: number; month: number; year: number } | null {
  const match = display.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const monthIdx = MONTHS_SHORT.indexOf(match[2]);
  const year = parseInt(match[3], 10);
  if (monthIdx < 0) return null;
  return { day, month: monthIdx, year };
}

type DatePickerFieldProps = {
  value: string;
  onSelect: (displayDate: string) => void;
  sem: SemanticTheme;
  placeholder?: string;
};

export const DatePickerField = memo(function DatePickerField({
  value,
  onSelect,
  sem,
  placeholder,
}: DatePickerFieldProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('profile.edit.selectDate', 'Select date');
  const [open, setOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const parsed = parseDisplayDate(value);
  const [day, setDay] = useState(parsed?.day ?? 1);
  const [month, setMonth] = useState(parsed?.month ?? 0);
  const [year, setYear] = useState(parsed?.year ?? 1995);

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  const ITEM_H = 40;
  const VISIBLE_ITEMS = 5;
  const PICKER_H = ITEM_H * VISIBLE_ITEMS;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const validDay = Math.min(day, daysInMonth);

  const years = (() => {
    const now = new Date();
    const maxYear = now.getFullYear() - 18;
    const minYear = now.getFullYear() - 100;
    const arr: number[] = [];
    for (let y = minYear; y <= maxYear; y++) arr.push(y);
    return arr;
  })();

  useEffect(() => {
    if (open) {
      setDateError(null);
      if (parsed) {
        setDay(parsed.day);
        setMonth(parsed.month);
        setYear(parsed.year);
      }
    }
  }, [open]);

  const scrollToValue = (ref: React.RefObject<ScrollView | null>, index: number) => {
    ref.current?.scrollTo({ y: index * ITEM_H, animated: false });
  };

  useEffect(() => {
    if (open) {
      const dayIdx = Math.max(0, validDay - 1);
      const monthIdx = month;
      const yearIdx = Math.max(0, years.indexOf(year));
      setTimeout(() => {
        scrollToValue(dayScrollRef, dayIdx);
        scrollToValue(monthScrollRef, monthIdx);
        scrollToValue(yearScrollRef, yearIdx);
      }, 50);
    }
  }, [open]);

  const handleDayScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const newDay = Math.min(Math.max(1, idx + 1), daysInMonth);
    if (newDay !== day) { setDay(newDay); setDateError(null); }
  };

  const handleMonthScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const newMonth = Math.min(Math.max(0, idx), 11);
    if (newMonth !== month) { setMonth(newMonth); setDateError(null); }
  };

  const handleYearScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const newYear = years[Math.min(Math.max(0, idx), years.length - 1)];
    if (newYear && newYear !== year) { setYear(newYear); setDateError(null); }
  };

  const handleConfirm = () => {
    const d = Math.min(day, daysInMonth);
    if (!is18OrOlder(d, month, year)) {
      setDateError(t('profile.edit.underage'));
      return;
    }
    setDateError(null);
    const display = `${d} ${MONTHS_SHORT[month]} ${year}`;
    onSelect(display);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-2xl border"
        style={{ backgroundColor: sem.surfaceMuted, borderColor: sem.border, paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <Ionicons name="calendar-outline" size={20} color={sem.textMuted} style={{ marginRight: 12 }} />
        <Text
          className="flex-1"
          style={{ color: value ? sem.textPrimary : sem.textMuted, fontSize: 17 }}
        >
          {value || resolvedPlaceholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={sem.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dpStyles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[dpStyles.card, { backgroundColor: sem.surface }]} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={dpStyles.header}>
              <View style={dpStyles.headerIconWrap}>
                <Ionicons name="calendar" size={22} color={sem.accent} />
              </View>
              <Text style={[dpStyles.title, { color: sem.textPrimary }]}>{t('profile.details.dateOfBirth')}</Text>
              <Text style={[dpStyles.subtitle, { color: sem.textSecondary }]}>{t('profile.edit.mustBe18', 'You must be 18 or older')}</Text>
            </View>

            {/* Picker */}
            <View style={[dpStyles.pickerWrap, { backgroundColor: sem.surfaceMuted }]}>
              {/* Selection highlight band */}
              <View style={[dpStyles.selectionBand, { borderTopColor: sem.border, borderBottomColor: sem.border }]} />

              <View style={dpStyles.pickerRow}>
                {/* Day */}
                <View style={dpStyles.column}>
                  <ScrollView
                    ref={dayScrollRef}
                    style={{ height: PICKER_H }}
                    onScroll={handleDayScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
                  >
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <Pressable key={d} onPress={() => { setDay(d); setDateError(null); scrollToValue(dayScrollRef, d - 1); }}>
                        <Text style={[dpStyles.item, { color: d === validDay ? sem.accent : sem.textSecondary, fontWeight: d === validDay ? '700' : '400' }]}>{d}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Month */}
                <View style={dpStyles.column}>
                  <ScrollView
                    ref={monthScrollRef}
                    style={{ height: PICKER_H }}
                    onScroll={handleMonthScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
                  >
                    {MONTHS_FULL.map((m, idx) => (
                      <Pressable key={m} onPress={() => { setMonth(idx); setDateError(null); scrollToValue(monthScrollRef, idx); }}>
                        <Text style={[dpStyles.item, { color: idx === month ? sem.accent : sem.textSecondary, fontWeight: idx === month ? '700' : '400' }]}>{m}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Year */}
                <View style={dpStyles.column}>
                  <ScrollView
                    ref={yearScrollRef}
                    style={{ height: PICKER_H }}
                    onScroll={handleYearScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
                  >
                    {years.map((y) => (
                      <Pressable key={y} onPress={() => { setYear(y); setDateError(null); scrollToValue(yearScrollRef, years.indexOf(y)); }}>
                        <Text style={[dpStyles.item, { color: y === year ? sem.accent : sem.textSecondary, fontWeight: y === year ? '700' : '400' }]}>{y}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {dateError && (
              <View style={dpStyles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={dpStyles.errorText}>{dateError}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={dpStyles.buttonRow}>
              <Pressable
                style={[dpStyles.buttonSecondary, { borderColor: sem.border }]}
                onPress={() => setOpen(false)}
              >
                <Text style={[dpStyles.buttonSecondaryText, { color: sem.textSecondary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[dpStyles.buttonPrimary, { backgroundColor: sem.accent }]}
                onPress={handleConfirm}
              >
                <Text style={dpStyles.buttonPrimaryText}>{t('profile.edit.confirm', 'Confirm')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Picker
  pickerWrap: {
    borderRadius: 14,
    padding: 8,
    marginBottom: 16,
    position: 'relative',
  },
  selectionBand: {
    position: 'absolute',
    top: '50%',
    left: 8,
    right: 8,
    height: 40,
    marginTop: -20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  column: {
    flex: 1,
  },
  item: {
    fontSize: 16,
    textAlign: 'center',
    height: 40,
    lineHeight: 40,
  },
  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

// ─── Bottom-sheet picker (SelectField dropdown) ───────────────────────────────

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    // Soft shadow on top edge
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 17,
    flex: 1,
  },
});
