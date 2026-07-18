import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

// ─── Section Card ───────────────────────────────────────────────────────────────

type SectionCardProps = {
  children: React.ReactNode;
  sem: SemanticTheme;
};

export const SectionCard = memo(function SectionCard({ children, sem }: SectionCardProps) {
  return (
    <View
      className="rounded-3xl px-5 py-6 mb-4"
      style={{
        backgroundColor: sem.surface,
        shadowColor: sem.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
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
      className="text-xl font-bold mb-4"
      style={{ color: sem.textPrimary }}
    >
      {title}
    </Text>
  );
});

// ─── Row Pair (two-column layout) ───────────────────────────────────────────────

export function RowPair({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-3 mb-3">
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
    <View className={flex ? 'flex-1' : 'w-full'}>
      <Text
        className="text-sm font-medium mb-1.5"
        style={{ color: sem.textSecondary }}
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
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
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
      className="flex-row items-center rounded-xl px-3 py-3 border"
      style={{
        backgroundColor: sem.surfaceMuted,
        borderColor: sem.border,
      }}
    >
      {leftIcon && (
        <Ionicons name={leftIcon} size={16} color={sem.textMuted} style={{ marginRight: 8 }} />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={sem.textMuted}
        editable={editable}
        className="flex-1 text-base"
        style={{ color: sem.textPrimary, padding: 0 }}
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
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  placeholder?: string;
};

export const SelectField = memo(function SelectField({
  value,
  options,
  onSelect,
  sem,
  leftIcon,
  placeholder,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback((opt: string) => {
    onSelect(opt);
    setOpen(false);
  }, [onSelect]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-xl px-3 py-3 border"
        style={{
          backgroundColor: sem.surfaceMuted,
          borderColor: sem.border,
        }}
        accessibilityRole="button"
        accessibilityLabel={placeholder ? `${placeholder}: ${value}` : value}
      >
        {leftIcon && (
          <Ionicons name={leftIcon} size={16} color={sem.textMuted} style={{ marginRight: 8 }} />
        )}
        <Text
          className="flex-1 text-base"
          style={{ color: value ? sem.textPrimary : sem.textMuted }}
          numberOfLines={1}
        >
          {value || placeholder || 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={sem.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              className="rounded-t-3xl px-5 pt-6 pb-10 max-h-96"
              style={{ backgroundColor: sem.surface }}
            >
              <Text className="text-lg font-bold mb-4" style={{ color: sem.textPrimary }}>
                {placeholder || 'Select option'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {options.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => handleSelect(opt)}
                    className="py-3 px-4 rounded-xl mb-1"
                    style={{
                      backgroundColor: opt === value ? sem.accentSoft : 'transparent',
                    }}
                    accessibilityRole="menuitem"
                  >
                    <Text
                      className="text-base font-medium"
                      style={{ color: opt === value ? sem.accent : sem.textPrimary }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
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
      className="rounded-xl px-4 py-3 border"
      style={{
        backgroundColor: sem.surfaceMuted,
        borderColor: sem.border,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={sem.textMuted}
        multiline
        maxLength={maxLength}
        className="text-base min-h-[80px]"
        style={{ color: sem.textPrimary, textAlignVertical: 'top', padding: 0 }}
      />
      <Text className="text-sm text-right mt-2" style={{ color: sem.textMuted }}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
});

// ─── Helper Text ────────────────────────────────────────────────────────────────

export function HelperText({ text, sem }: { text: string; sem: SemanticTheme }) {
  return (
    <Text className="text-sm mt-1.5 ml-1" style={{ color: sem.textMuted }}>
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
            className="rounded-full px-4 py-2 border"
            style={{
              backgroundColor: isActive ? sem.accentSoft : sem.surfaceMuted,
              borderColor: isActive ? sem.accent : sem.border,
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={opt}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isActive ? sem.accent : sem.textSecondary }}
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

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function is18OrOlder(day: number, month: number, year: number): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eighteenthBirthday = new Date(year + 18, month, day);
  return eighteenthBirthday <= today;
}

function parseDisplayDate(display: string): { day: number; month: number; year: number } | null {
  const match = display.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
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
  placeholder = 'Select date',
}: DatePickerFieldProps) {
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
    const arr: number[] = [];
    for (let y = 1950; y <= maxYear; y++) arr.push(y);
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
      setDateError('You must be at least 18 years old to use Qaliye.');
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
        className="flex-row items-center rounded-xl px-3 py-3 border"
        style={{ backgroundColor: sem.surfaceMuted, borderColor: sem.border }}
      >
        <Ionicons name="calendar-outline" size={16} color={sem.textMuted} style={{ marginRight: 8 }} />
        <Text
          className="flex-1 text-base"
          style={{ color: value ? sem.textPrimary : sem.textMuted }}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={sem.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={dpStyles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[dpStyles.card, { backgroundColor: sem.surface, borderColor: sem.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[dpStyles.title, { color: sem.textPrimary }]}>Date of Birth</Text>
            <Text style={[dpStyles.subtitle, { color: sem.textSecondary }]}>You must be 18 or older</Text>

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
                      <Text style={[dpStyles.item, { color: d === validDay ? sem.accent : sem.textSecondary }]}>{d}</Text>
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
                      <Text style={[dpStyles.item, { color: idx === month ? sem.accent : sem.textSecondary }]}>{m}</Text>
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
                      <Text style={[dpStyles.item, { color: y === year ? sem.accent : sem.textSecondary }]}>{y}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {dateError && (
              <View style={dpStyles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={dpStyles.errorText}>{dateError}</Text>
              </View>
            )}

            <View style={dpStyles.buttonRow}>
              <Pressable style={[dpStyles.button, { borderColor: sem.border }]} onPress={() => setOpen(false)}>
                <Text style={[dpStyles.buttonText, { color: sem.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[dpStyles.button, { borderColor: sem.accent, backgroundColor: sem.accentSoft }]} onPress={handleConfirm}>
                <Text style={[dpStyles.buttonText, { color: sem.accent }]}>Confirm</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  item: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    height: 40,
    lineHeight: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
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
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
