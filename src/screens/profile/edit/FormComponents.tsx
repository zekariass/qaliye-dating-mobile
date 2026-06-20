import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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
      className="text-lg font-bold mb-4"
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
        className="text-xs font-medium mb-1.5"
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
};

export const TextInputField = memo(function TextInputField({
  value,
  onChangeText,
  sem,
  placeholder,
  leftIcon,
  editable = true,
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
        className="flex-1 text-sm"
        style={{ color: sem.textPrimary, padding: 0 }}
      />
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
          className="flex-1 text-sm"
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
              <Text className="text-base font-bold mb-4" style={{ color: sem.textPrimary }}>
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
                      className="text-sm font-medium"
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
        className="text-sm min-h-[80px]"
        style={{ color: sem.textPrimary, textAlignVertical: 'top', padding: 0 }}
      />
      <Text className="text-xs text-right mt-2" style={{ color: sem.textMuted }}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
});

// ─── Helper Text ────────────────────────────────────────────────────────────────

export function HelperText({ text, sem }: { text: string; sem: SemanticTheme }) {
  return (
    <Text className="text-xs mt-1.5 ml-1" style={{ color: sem.textMuted }}>
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
              className="text-xs font-semibold"
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
