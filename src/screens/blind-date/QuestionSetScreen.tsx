import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlindDateBottomNav from '@/components/blind-date/BlindDateBottomNav';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import {
    useBlindDateConfiguration
} from '@/hooks/blindDate/useBlindDateConfiguration';
import { useCatalogCategories, useCatalogQuestions } from '@/hooks/blindDate/useCatalog';
import {
    BLIND_DATE_QUESTION_SET_KEY,
    useQuestionSet,
    useQuestionSetMutations,
} from '@/hooks/blindDate/useQuestionSet';
import { useTheme } from '@/hooks/use-theme';
import type {
    BlindDateCatalogCategoryDto,
    BlindDateCatalogQuestionDto,
    BlindDateCustomQuestionDto,
    BlindDateQuestionSetDto,
    BlindDateSetQuestionDto,
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

const MAX_QUESTION_LEN = 500;
const MAX_ANSWER_LEN = 2000;

// ─── Theme ────────────────────────────────────────────────────────────────────

function useQTheme() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return {
    isDark,
    bg:          th.background,
    card:        th.surface,
    textPrimary: th.text,
    textMuted:   th.textSecondary,
    purple:      colors.primary,
    chipBg:      isDark ? '#2E1F50' : '#F2E7FF',
    border:      th.border,
    sheetBg:     isDark ? th.backgroundElement : th.surface,
    inputBg:     isDark ? '#160F24' : '#FAF7FF',
  };
}

function fieldError(err: unknown): string {
  const { code, message } = extractApiError(err);
  switch (code.toLowerCase()) {
    case 'answer_too_long':
      return `Answers can be at most ${MAX_ANSWER_LEN} characters.`;
    case 'question_too_long':
      return `Questions can be at most ${MAX_QUESTION_LEN} characters.`;
    case 'question_required':
      return 'Please write a question.';
    default:
      return message;
  }
}

// ─── Gradient CTA ─────────────────────────────────────────────────────────────

function GradientCta({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, (disabled || loading) && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={bdGradients.hero as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color="#FFF" size="small" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Sheet scaffold ───────────────────────────────────────────────────────────

function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { sheetBg, textMuted } = useQTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetAvoid}
        >
          <View
            style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            {children}
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Answer editor (platform set question) ────────────────────────────────────

function AnswerSheet({
  target,
  onClose,
  onSave,
  saving,
}: {
  target: BlindDateSetQuestionDto | null;
  onClose: () => void;
  onSave: (answer: string, onError: (msg: string) => void) => void;
  saving: boolean;
}) {
  const { sheetBg } = useQTheme();
  return (
    <Modal visible={!!target} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.customScreen, { backgroundColor: sheetBg }]}>
        {/* Keyed per target so the draft resets cleanly between questions. */}
        {target && (
          <AnswerForm
            key={target.id}
            target={target}
            onClose={onClose}
            onSave={onSave}
            saving={saving}
          />
        )}
      </View>
    </Modal>
  );
}

function AnswerForm({
  target,
  onClose,
  onSave,
  saving,
}: {
  target: BlindDateSetQuestionDto;
  onClose: () => void;
  onSave: (answer: string, onError: (msg: string) => void) => void;
  saving: boolean;
}) {
  const { textPrimary, textMuted, border, inputBg, isDark } = useQTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(target.answer ?? '');
  const [error, setError] = useState<string | null>(null);

  // Keyboard-safe scroll — same pattern as the custom-question composer.
  const scrollRef = useRef<ScrollView>(null);
  const fieldYRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, fieldYRef.current - 12), animated: true });
      }, Platform.OS === 'ios' ? 280 : 80);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {/* Header — matches the custom-question composer */}
      <View style={[styles.customHead, { paddingTop: insets.top + 8, borderBottomColor: border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.customTitle, { color: textPrimary }]}>Your Answer</Text>
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.customCancel, { color: bdColors.primaryLight }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="none"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}
      >
        {/* Question card */}
        <View style={[styles.customHero, { backgroundColor: isDark ? 'rgba(138,44,255,0.10)' : '#F2E7FF' }]}>
          <View style={styles.customHeroIcon}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
          </View>
          <Text style={[styles.sheetQuestion, { flex: 1, color: textPrimary, marginBottom: 0 }]}>
            {target.question}
          </Text>
        </View>

        <View onLayout={(e) => { fieldYRef.current = e.nativeEvent.layout.y; }}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: textPrimary }]}>
              Your answer <Text style={{ color: bdColors.primaryLight }}>*</Text>
            </Text>
            <Text style={[styles.charCount, { color: textMuted, marginTop: 0 }]}>
              {draft.length}/{MAX_ANSWER_LEN}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: textPrimary, borderColor: border, backgroundColor: inputBg }]}
            placeholder="Type your answer…"
            placeholderTextColor={textMuted}
            multiline
            maxLength={MAX_ANSWER_LEN}
            value={draft}
            onChangeText={setDraft}
            autoFocus
          />
        </View>

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}

        <View style={{ marginTop: 18 }}>
          <GradientCta
            label="Save Answer"
            loading={saving}
            onPress={() => {
              const a = draft.trim();
              if (!a) {
                setError('Please write an answer.');
                return;
              }
              onSave(a, setError);
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.customCancelBtn}
          onPress={onClose}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={[styles.customCancelBtnText, { color: textPrimary }]}>Cancel</Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: textMuted, marginTop: 16 }]}>
          Answers stay anonymous — participants see them without knowing who wrote them.
        </Text>

        {/* Scrollable room while the keyboard is open */}
        <View style={{ height: keyboardHeight }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Custom question composer (create / edit) ─────────────────────────────────

const QUESTION_TIPS = [
  'Be open-ended to get meaningful answers',
  'Keep it respectful and positive',
  'Avoid sensitive or overly personal questions early on',
  'Make it relevant to getting to know the person',
];

function CustomQuestionSheet({
  target,
  onClose,
  onCreate,
  onEdit,
  saving,
}: {
  target: BlindDateCustomQuestionDto | 'new' | null;
  onClose: () => void;
  onCreate: (question: string, answer: string, onError: (msg: string) => void) => void;
  onEdit: (id: string, patch: { question?: string; answer?: string }, onError: (msg: string) => void) => void;
  saving: boolean;
}) {
  const { sheetBg } = useQTheme();
  const editKey = typeof target === 'object' && target !== null ? target.id : null;
  return (
    <Modal visible={!!target} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.customScreen, { backgroundColor: sheetBg }]}>
        {/* Keyed per target (or "new") so the form resets cleanly. */}
        {target && (
          <CustomQuestionForm
            key={editKey ?? 'new'}
            target={editKey ? (target as BlindDateCustomQuestionDto) : null}
            onClose={onClose}
            onCreate={onCreate}
            onEdit={onEdit}
            saving={saving}
          />
        )}
      </View>
    </Modal>
  );
}

function CustomQuestionForm({
  target,
  onClose,
  onCreate,
  onEdit,
  saving,
}: {
  target: BlindDateCustomQuestionDto | null;
  onClose: () => void;
  onCreate: (question: string, answer: string, onError: (msg: string) => void) => void;
  onEdit: (id: string, patch: { question?: string; answer?: string }, onError: (msg: string) => void) => void;
  saving: boolean;
}) {
  const { textPrimary, textMuted, border, inputBg, isDark } = useQTheme();
  const insets = useSafeAreaInsets();
  const isEdit = target !== null;
  const [question, setQuestion] = useState(target?.question ?? '');
  const [answer, setAnswer] = useState(target?.answer ?? '');
  const [error, setError] = useState<string | null>(null);

  // Keyboard handling — spacer inside the scroll content guarantees room to
  // scroll the focused field above the keyboard on both platforms.
  const scrollRef = useRef<ScrollView>(null);
  const focusYRef = useRef(0);
  const fieldYRef = useRef({ q: 0, a: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, focusYRef.current - 12), animated: true });
      }, Platform.OS === 'ios' ? 280 : 80);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // Soft rose tint — much lighter than the deep rose so the cards read calm.
  const softBg = isDark ? 'rgba(138,44,255,0.10)' : '#F2E7FF';

  const submit = () => {
    const q = question.trim();
    const a = answer.trim();
    if (!q) return setError('Please write a question.');
    if (q.length > MAX_QUESTION_LEN) return setError(`Questions can be at most ${MAX_QUESTION_LEN} characters.`);
    if (!a) return setError('Please write your answer.');
    if (target) {
      const patch: { question?: string; answer?: string } = {};
      if (q !== target.question) patch.question = q;
      if (a !== (target.answer ?? '')) patch.answer = a;
      if (Object.keys(patch).length === 0) return onClose();
      onEdit(target.id, patch, setError);
    } else {
      onCreate(q, a, setError);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {/* Header — back chevron, title, cancel (reference screen 2) */}
      <View style={[styles.customHead, { paddingTop: insets.top + 8, borderBottomColor: border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.customTitle, { color: textPrimary }]}>
          {isEdit ? 'Edit Custom Question' : 'Create Custom Question'}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.customCancel, { color: bdColors.primaryLight }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="none"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }}
      >
        <Text style={[styles.customSub, { color: textMuted }]}>
          {isEdit ? 'Update your custom question' : 'Add your own question to your set'}
        </Text>

        {/* Hero card */}
        <View style={[styles.customHero, { backgroundColor: softBg }]}>
          <View style={styles.customHeroIcon}>
            <Ionicons name="pencil" size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customHeroTitle, { color: textPrimary }]}>
              Your questions, your way
            </Text>
            <Text style={[styles.customHeroSub, { color: textMuted }]}>
              Add a custom question to make your Blind Date more personal and meaningful.
            </Text>
          </View>
        </View>

        {/* Question field */}
        <View
          onLayout={(e) => { fieldYRef.current.q = e.nativeEvent.layout.y; }}
        >
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: textPrimary }]}>
              Question <Text style={{ color: bdColors.primaryLight }}>*</Text>
            </Text>
            <Text style={[styles.charCount, { color: textMuted, marginTop: 0 }]}>
              {question.length}/{MAX_QUESTION_LEN}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: textPrimary, borderColor: border, backgroundColor: inputBg }]}
            placeholder="Type your question here…"
            placeholderTextColor={textMuted}
            multiline
            maxLength={MAX_QUESTION_LEN}
            value={question}
            onChangeText={setQuestion}
            onFocus={() => { focusYRef.current = fieldYRef.current.q; }}
            autoFocus={!isEdit}
          />
        </View>

        {/* Answer field — required: custom questions are stored with the writer's answer */}
        <View
          style={{ marginTop: 18 }}
          onLayout={(e) => { fieldYRef.current.a = e.nativeEvent.layout.y; }}
        >
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: textPrimary }]}>
              Your answer <Text style={{ color: bdColors.primaryLight }}>*</Text>
            </Text>
            <Text style={[styles.charCount, { color: textMuted, marginTop: 0 }]}>
              {answer.length}/{MAX_ANSWER_LEN}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: textPrimary, borderColor: border, backgroundColor: inputBg }]}
            placeholder="Type your answer…"
            placeholderTextColor={textMuted}
            multiline
            maxLength={MAX_ANSWER_LEN}
            value={answer}
            onChangeText={setAnswer}
            onFocus={() => { focusYRef.current = fieldYRef.current.a; }}
          />
        </View>

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}

        {/* Tips card */}
        <View style={[styles.customTips, { backgroundColor: softBg }]}>
          <View style={styles.customTipsHead}>
            <Ionicons name="bulb-outline" size={18} color={bdColors.primaryLight} />
            <Text style={[styles.customTipsTitle, { color: textPrimary }]}>
              Tips for great questions
            </Text>
          </View>
          {QUESTION_TIPS.map((tip) => (
            <View key={tip} style={styles.customTipRow}>
              <Ionicons name="checkmark" size={15} color={bdColors.primaryLight} />
              <Text style={[styles.customTipText, { color: textMuted }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <GradientCta
          label={isEdit ? 'Save Changes' : 'Save Question'}
          loading={saving}
          onPress={submit}
        />
        <TouchableOpacity
          style={styles.customCancelBtn}
          onPress={onClose}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={[styles.customCancelBtnText, { color: textPrimary }]}>Cancel</Text>
        </TouchableOpacity>

        {/* Scrollable room while the keyboard is open */}
        <View style={{ height: keyboardHeight }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Catalog browser ──────────────────────────────────────────────────────────

/** Soft icon tints cycled across category accordions. */
const CAT_TINTS: { bg: string; fg: string }[] = [
  { bg: '#EFE7FF', fg: '#8A2CFF' },
  { bg: '#FFE8D6', fg: '#C05621' },
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#D1FAE5', fg: '#047857' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#E0E7FF', fg: '#4338CA' },
];

/** Best-effort icon for a catalog category when `icon_url` is absent. */
function categoryIcon(
  code: string | null | undefined,
  name: string,
): keyof typeof Ionicons.glyphMap {
  const k = `${code ?? ''} ${name}`.toUpperCase();
  if (/FAMILY/.test(k)) return 'people-circle-outline';
  if (/FAITH|BELIEF|RELIGION|SPIRIT/.test(k)) return 'flower-outline';
  if (/CAREER|GOAL|WORK|AMBITION/.test(k)) return 'briefcase-outline';
  if (/FUN|LIGHT|GAME/.test(k)) return 'happy-outline';
  if (/TRAVEL|ADVENTURE/.test(k)) return 'airplane-outline';
  if (/FOOD|COOK/.test(k)) return 'restaurant-outline';
  if (/RELATION|LOVE|PARTNER/.test(k)) return 'heart-outline';
  if (/VALUE|LIFE/.test(k)) return 'leaf-outline';
  if (/KNOW|INTRO|FIRST/.test(k)) return 'sparkles-outline';
  return 'chatbubble-ellipses-outline';
}

/**
 * One catalog question row inside an expanded category accordion. Owns its
 * draft-answer + error state so expanding a question never leaks state into
 * a sibling row.
 */
function CatalogQuestionRow({
  question,
  added,
  adding,
  setFull,
  onAdd,
}: {
  question: BlindDateCatalogQuestionDto;
  added: boolean;
  adding: boolean;
  setFull: boolean;
  onAdd: (questionId: string, answer: string | undefined, onError: (msg: string) => void) => void;
}) {
  const { textPrimary, textMuted, purple, border, inputBg } = useQTheme();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <View>
      <TouchableOpacity
        style={styles.accQRow}
        onPress={() => {
          if (added) return;
          setExpanded((e) => !e);
          setError(null);
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        disabled={added}
      >
        <Ionicons
          name={added ? 'checkbox' : expanded ? 'chevron-up' : 'square-outline'}
          size={20}
          color={added ? '#22C55E' : expanded ? purple : textMuted}
        />
        <Text style={[styles.accQText, { color: added ? textMuted : textPrimary }]} numberOfLines={3}>
          {question.question}
        </Text>
        {added && (
          <View style={styles.addedPill}>
            <Text style={styles.addedPillText}>Added</Text>
          </View>
        )}
      </TouchableOpacity>

      {expanded && !added && (
        <View style={styles.accQExpand}>
          {setFull ? (
            <View style={styles.setFullHint}>
              <Ionicons name="information-circle-outline" size={15} color="#F59E0B" />
              <Text style={styles.setFullHintText}>
                Question set full — remove a question to add another.
              </Text>
            </View>
          ) : (
            <>
              {/* Answer textarea — multiline, matches the "your answer" composer */}
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: textPrimary, borderColor: border, backgroundColor: inputBg },
                ]}
                placeholder="Your answer (optional — you can answer later)"
                placeholderTextColor={textMuted}
                multiline
                maxLength={MAX_ANSWER_LEN}
                value={draft}
                onChangeText={setDraft}
              />
              <Text style={[styles.charCount, { color: textMuted }]}>
                {draft.length}/{MAX_ANSWER_LEN}
              </Text>
              {error ? <Text style={styles.fieldError}>{error}</Text> : null}
              <View style={{ marginTop: 8 }}>
                <GradientCta
                  label="Add to my set"
                  loading={adding}
                  onPress={() => onAdd(question.id, draft.trim() || undefined, setError)}
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** Accordion section for one catalog category — lazily loads its questions. */
function CategoryAccordion({
  category,
  index,
  language,
  sheetVisible,
  inSetIds,
  setFull,
  onAdd,
  addingId,
}: {
  category: BlindDateCatalogCategoryDto;
  index: number;
  language: string;
  sheetVisible: boolean;
  inSetIds: Set<string>;
  setFull: boolean;
  onAdd: (questionId: string, answer: string | undefined, onError: (msg: string) => void) => void;
  addingId: string | null;
}) {
  const { textPrimary, textMuted, purple, border, chipBg, isDark } = useQTheme();
  const [open, setOpen] = useState(false);
  // Questions load only when the section is opened — cached per category.
  const { questions, isLoading, isError, refetch } = useCatalogQuestions(
    language,
    category.id,
    sheetVisible && open,
  );

  const tint = CAT_TINTS[index % CAT_TINTS.length];
  const addedCount = questions.filter((q) => inSetIds.has(q.id)).length;
  const count = category.question_count ?? (open && !isLoading ? questions.length : null);

  return (
    <View
      style={[
        styles.accCard,
        { borderColor: border, backgroundColor: isDark ? '#1D1230' : '#FFF' },
      ]}
    >
      <TouchableOpacity
        style={styles.accHead}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${category.name} category`}
      >
        <View style={[styles.accIcon, { backgroundColor: isDark ? `${tint.fg}33` : tint.bg }]}>
          {category.icon_url ? (
            <Image source={{ uri: category.icon_url }} style={styles.accIconImg} contentFit="contain" />
          ) : (
            <Ionicons name={categoryIcon(category.code, category.name)} size={16} color={tint.fg} />
          )}
        </View>
        <Text style={[styles.accName, { color: textPrimary }]} numberOfLines={1}>
          {category.name}
        </Text>
        {count != null && (
          <View style={[styles.accCount, { backgroundColor: chipBg }]}>
            <Text style={[styles.accCountText, { color: purple }]}>
              {count}
              {addedCount > 0 ? ` · ${addedCount} added` : ''}
            </Text>
          </View>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.accBody, { borderTopColor: border }]}>
          {isLoading ? (
            <ActivityIndicator color={purple} style={{ marginVertical: 18 }} />
          ) : isError ? (
            <View style={styles.accErr}>
              <Text style={[styles.catalogEmptyText, { color: textMuted }]}>
                Couldn’t load questions.
              </Text>
              <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
                <Text style={{ color: purple, fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : questions.length === 0 ? (
            <Text style={[styles.catalogEmptyText, { color: textMuted, paddingVertical: 14 }]}>
              No questions in this category yet.
            </Text>
          ) : (
            questions.map((q) => (
              <CatalogQuestionRow
                key={q.id}
                question={q}
                added={inSetIds.has(q.id)}
                adding={addingId === q.id}
                setFull={setFull}
                onAdd={onAdd}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function CatalogSheet({
  visible,
  onClose,
  language,
  inSetIds,
  setFull,
  onAdd,
  addingId,
}: {
  visible: boolean;
  onClose: () => void;
  language: string;
  inSetIds: Set<string>;
  setFull: boolean;
  onAdd: (questionId: string, answer: string | undefined, onError: (msg: string) => void) => void;
  addingId: string | null;
}) {
  const { sheetBg, textPrimary, textMuted, purple } = useQTheme();
  const insets = useSafeAreaInsets();

  const { categories, isLoading: catsLoading, isError, refetch } =
    useCatalogCategories(language, visible);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.catalogBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={[
              styles.catalogSheet,
              { backgroundColor: sheetBg, marginTop: insets.top + 40, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.catalogHead}>
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Question catalog</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.catalogSub, { color: textMuted }]}>
              Browse categories — tap a question to add it to your set.
            </Text>
            {setFull && (
              <View style={styles.setFullHint}>
                <Ionicons name="information-circle-outline" size={15} color="#F59E0B" />
                <Text style={styles.setFullHintText}>
                  Question set full — remove a question to add another.
                </Text>
              </View>
            )}

            {catsLoading ? (
              <ActivityIndicator color={purple} style={{ marginTop: 40 }} />
            ) : isError ? (
              <View style={styles.catalogEmpty}>
                <Ionicons name="alert-circle-outline" size={36} color={purple} />
                <Text style={[styles.catalogEmptyText, { color: textMuted }]}>
                  Couldn’t load categories.
                </Text>
                <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
                  <Text style={{ color: purple, fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.catalogEmpty}>
                    <Text style={[styles.catalogEmptyText, { color: textMuted }]}>
                      No question categories available.
                    </Text>
                  </View>
                }
                renderItem={({ item: c, index }) => (
                  <CategoryAccordion
                    category={c}
                    index={index}
                    language={language}
                    sheetVisible={visible}
                    inSetIds={inSetIds}
                    setFull={setFull}
                    onAdd={onAdd}
                    addingId={addingId}
                  />
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Language picker ──────────────────────────────────────────────────────────

function LanguageSheet({
  visible,
  onClose,
  languages,
  current,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  languages: { code: string; name: string }[];
  current: string;
  onPick: (code: string) => void;
}) {
  const { textPrimary, textMuted, purple } = useQTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[styles.sheetTitle, { color: textPrimary }]}>Question language</Text>
      <Text style={[styles.hint, { color: textMuted, marginBottom: 12 }]}>
        Platform questions are shown in this language.
      </Text>
      {languages.map((l) => {
        const active = l.code === current;
        return (
          <TouchableOpacity
            key={l.code}
            style={styles.langRow}
            onPress={() => {
              onPick(l.code);
              onClose();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.langText, { color: active ? purple : textPrimary }]}>{l.name}</Text>
            {active && <Ionicons name="checkmark" size={18} color={purple} />}
          </TouchableOpacity>
        );
      })}
    </Sheet>
  );
}

// ─── Set-question row ─────────────────────────────────────────────────────────

/** Per-category chip tint + icon for set rows (matches the catalog palette). */
const SET_CAT_CHIP: Record<string, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  GETTING_TO_KNOW: { bg: '#EFE7FF', fg: '#8A2CFF', icon: 'heart' },
  VALUES_BELIEFS: { bg: '#E0E7FF', fg: '#4338CA', icon: 'flower' },
  LIFESTYLE: { bg: '#DBEAFE', fg: '#1D4ED8', icon: 'briefcase' },
  RELATIONSHIPS: { bg: '#EFE7FF', fg: '#8A2CFF', icon: 'people' },
  FUN_RANDOM: { bg: '#FEF3C7', fg: '#B45309', icon: 'happy' },
};

const CUSTOM_CHIP = { bg: '#EFE7FF', fg: '#8A2CFF', icon: 'pencil' as const };

function prettyCode(code: string): string {
  const s = code.toLowerCase().replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SetQuestionRow({
  item,
  index,
  total,
  kind,
  categoryName,
  reorderMode,
  onEdit,
  onDelete,
  onMove,
  busy,
}: {
  item: { id: string; question: string; answer: string | null; category_code?: string | null };
  index: number;
  total: number;
  kind: 'platform' | 'custom';
  categoryName: string | null;
  reorderMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  busy: boolean;
}) {
  const { card, textPrimary, border, isDark } = useQTheme();
  const [showAnswer, setShowAnswer] = useState(false);
  const unanswered = item.answer == null || item.answer.trim() === '';
  const chip = kind === 'custom' ? CUSTOM_CHIP : (SET_CAT_CHIP[item.category_code ?? ''] ?? {
    bg: CAT_TINTS[index % CAT_TINTS.length].bg,
    fg: CAT_TINTS[index % CAT_TINTS.length].fg,
    icon: categoryIcon(item.category_code, categoryName ?? ''),
  });
  const chipBg = isDark ? `${chip.fg}2E` : chip.bg;
  const chipLabel =
    kind === 'custom' ? 'My Custom Question' : (categoryName ?? (item.category_code ? prettyCode(item.category_code) : 'Question'));

  return (
    <View style={[styles.qRow, { backgroundColor: card, borderColor: border }]}>

      {/* ── Row 1: number · question text ── */}
      <View style={styles.qTopRow}>
        <View style={[styles.numCircle, { backgroundColor: isDark ? 'rgba(138,44,255,0.18)' : '#EFE7FF' }]}>
          <Text style={[styles.numCircleText, { color: bdColors.primaryLight }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.qText, { color: textPrimary }]}>{item.question}</Text>
      </View>

      {/* ── Row 2: category chip (left) + answer status (right) ── */}
      <View style={styles.qMetaRow}>
        <View style={[styles.catTag, { backgroundColor: chipBg }]}>
          <Ionicons name={chip.icon} size={12} color={chip.fg} />
          <Text style={[styles.catTagText, { color: chip.fg }]} numberOfLines={1}>
            {chipLabel}
          </Text>
        </View>
        {unanswered ? (
          <TouchableOpacity
            style={styles.unansweredPill}
            onPress={onEdit}
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={11} color="#F59E0B" />
            <Text style={styles.unansweredText}>Add answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.viewAnswerBtn}
            onPress={() => setShowAnswer((s) => !s)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAnswer }}
          >
            <Ionicons
              name={showAnswer ? 'eye-off-outline' : 'eye-outline'}
              size={14}
              color={bdColors.primaryLight}
            />
            <Text style={styles.viewAnswerText}>
              {showAnswer ? 'Hide' : 'Answer'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Answer panel ── */}
      {showAnswer && !unanswered && (
        <View
          style={[
            styles.answerPanel,
            { backgroundColor: isDark ? 'rgba(138,44,255,0.08)' : '#F2E7FF', borderColor: border },
          ]}
        >
          <View style={styles.answerPanelHead}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={bdColors.primary} />
            <Text style={[styles.answerPanelLabel, { color: bdColors.primary }]}>Your answer</Text>
            <TouchableOpacity onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit answer">
              <Text style={[styles.answerPanelEdit, { color: bdColors.primaryLight }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.answerPanelText, { color: textPrimary }]}>{item.answer}</Text>
        </View>
      )}

      {/* ── Row 3: action bar — reorder OR edit/delete ── */}
      <View style={[styles.qActionRow, { borderTopColor: border }]}>
        {reorderMode ? (
          <>
            <TouchableOpacity
              style={[styles.qActionBtn, { opacity: index === 0 || busy ? 0.35 : 1 }]}
              onPress={() => onMove(-1)}
              disabled={index === 0 || busy}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Move up"
            >
              <Ionicons name="chevron-up" size={18} color={textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qActionBtn, { opacity: index === total - 1 || busy ? 0.35 : 1 }]}
              onPress={() => onMove(1)}
              disabled={index === total - 1 || busy}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Move down"
            >
              <Ionicons name="chevron-down" size={18} color={textPrimary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.qActionBtn}
              onPress={onEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={kind === 'custom' ? 'Edit question' : 'Edit answer'}
            >
              <Ionicons name="pencil-outline" size={17} color={bdColors.primaryLight} />
            </TouchableOpacity>
            <View style={[styles.qActionDivider, { backgroundColor: border }]} />
            <TouchableOpacity
              style={styles.qActionBtn}
              onPress={onDelete}
              hitSlop={8}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={kind === 'custom' ? 'Delete question' : 'Remove question'}
            >
              <Ionicons name="trash-outline" size={17} color={bdColors.primaryLight} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuestionSetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { bg, card, textPrimary, textMuted, purple, border, isDark } = useQTheme();

  const { questions, customQuestions, isLoading, isError, refetch, isRefetching } =
    useQuestionSet();
  const mutations = useQuestionSetMutations();
  const { configuration, refetch: refetchConfig, dataUpdatedAt: configUpdatedAt } =
    useBlindDateConfiguration();

  // Refetch limits when returning to the screen after the config has gone
  // stale — server-side caps may have changed since the last visit.
  useFocusEffect(
    useCallback(() => {
      if (configUpdatedAt > 0 && Date.now() - configUpdatedAt > 60_000) void refetchConfig();
    }, [configUpdatedAt, refetchConfig]),
  );

  const [answerTarget, setAnswerTarget] = useState<BlindDateSetQuestionDto | null>(null);
  const [customTarget, setCustomTarget] = useState<BlindDateCustomQuestionDto | 'new' | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const listScrollRef = useRef<ScrollView>(null);

  const language = configuration?.language_code ?? 'en';
  const { categories } = useCatalogCategories(language);
  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const inSetIds = useMemo(() => new Set(questions.map((q) => q.question_id)), [questions]);
  const totalCount = questions.length + customQuestions.length;

  // Question-set caps — undefined → older backend, no client-side cap.
  const maxSet = configuration?.limits?.max_questions;
  const maxCustom = configuration?.limits?.max_custom_questions;
  const platformFull = maxSet != null && questions.length >= maxSet;
  const customFull = maxCustom != null && customQuestions.length >= maxCustom;

  // Cap errors can arrive despite client-side checks (stale config, limits
  // changed server-side) — resync question-set + limits and surface the error.
  const resyncLimits = () => {
    void mutations.invalidate();
    void refetchConfig();
  };

  const err = (msg: string) => themedError('Something went wrong', msg);

  // ── Platform question handlers ──────────────────────────────────────────
  const handleSaveAnswer = (answer: string, onError: (m: string) => void) => {
    if (!answerTarget) return;
    mutations.updateAnswer.mutate(
      { setQuestionId: answerTarget.id, answer },
      {
        onSuccess: () => setAnswerTarget(null),
        onError: (e) => onError(fieldError(e)),
      },
    );
  };

  const handleDeleteSetQuestion = (item: BlindDateSetQuestionDto) => {
    themedAlert({
      title: 'Remove question?',
      message: `"${item.question}" will be removed from your set.`,
      icon: 'trash-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          icon: 'trash-outline',
          onPress: () =>
            mutations.removeQuestion.mutate(item.id, {
              onError: (e) => mutations.onMutationError(e, err),
            }),
        },
      ],
    });
  };

  // The backend's reorder endpoint only sets one row's sort_order — it doesn't
  // shift the others. A move is therefore a swap: update both rows.
  const swapPlatform = (a: BlindDateSetQuestionDto, b: BlindDateSetQuestionDto, aIdx: number, bIdx: number) => {
    const aOrder = aIdx + 1;
    const bOrder = bIdx + 1;
    queryClient.setQueryData<BlindDateQuestionSetDto>(BLIND_DATE_QUESTION_SET_KEY, (old) =>
      old
        ? {
            ...old,
            questions: old.questions.map((q) =>
              q.id === a.id ? { ...q, sort_order: bOrder } : q.id === b.id ? { ...q, sort_order: aOrder } : q,
            ),
          }
        : old,
    );
    mutations.reorderQuestion.mutate(
      { setQuestionId: a.id, sortOrder: bOrder },
      { onError: (e) => mutations.onMutationError(e, err) },
    );
    mutations.reorderQuestion.mutate(
      { setQuestionId: b.id, sortOrder: aOrder },
      { onError: (e) => mutations.onMutationError(e, err) },
    );
  };

  const handleMove = (item: BlindDateSetQuestionDto, index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    swapPlatform(item, questions[target], index, target);
  };

  // ── Custom question handlers ────────────────────────────────────────────
  const handleCreateCustom = (question: string, answer: string, onError: (m: string) => void) => {
    mutations.addCustom.mutate(
      { question, answer },
      {
        onSuccess: () => setCustomTarget(null),
        onError: (e) => {
          if (extractApiError(e).code.toLowerCase() === 'max_custom_questions_reached') {
            resyncLimits();
            onError(`Custom questions are capped at ${maxCustom ?? 'the server limit'} — remove one to add another.`);
            return;
          }
          onError(fieldError(e));
        },
      },
    );
  };

  const handleEditCustom = (
    id: string,
    patch: { question?: string; answer?: string },
    onError: (m: string) => void,
  ) => {
    mutations.editCustom.mutate(
      { customQuestionId: id, patch },
      {
        onSuccess: () => setCustomTarget(null),
        onError: (e) => onError(fieldError(e)),
      },
    );
  };

  const handleDeleteCustom = (item: BlindDateCustomQuestionDto) => {
    themedAlert({
      title: 'Delete question?',
      message: `"${item.question}" will be permanently deleted.`,
      icon: 'trash-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          icon: 'trash-outline',
          onPress: () =>
            mutations.removeCustom.mutate(item.id, {
              onError: (e) => mutations.onMutationError(e, err),
            }),
        },
      ],
    });
  };

  const swapCustom = (a: BlindDateCustomQuestionDto, b: BlindDateCustomQuestionDto, aIdx: number, bIdx: number) => {
    const aOrder = aIdx + 1;
    const bOrder = bIdx + 1;
    queryClient.setQueryData<BlindDateQuestionSetDto>(BLIND_DATE_QUESTION_SET_KEY, (old) =>
      old
        ? {
            ...old,
            custom_questions: old.custom_questions.map((q) =>
              q.id === a.id ? { ...q, sort_order: bOrder } : q.id === b.id ? { ...q, sort_order: aOrder } : q,
            ),
          }
        : old,
    );
    mutations.editCustom.mutate(
      { customQuestionId: a.id, patch: { sortOrder: bOrder } },
      { onError: (e) => mutations.onMutationError(e, err) },
    );
    mutations.editCustom.mutate(
      { customQuestionId: b.id, patch: { sortOrder: aOrder } },
      { onError: (e) => mutations.onMutationError(e, err) },
    );
  };

  const handleMoveCustom = (item: BlindDateCustomQuestionDto, index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= customQuestions.length) return;
    swapCustom(item, customQuestions[target], index, target);
  };

  // ── Catalog add ─────────────────────────────────────────────────────────
  const handleAddFromCatalog = (
    questionId: string,
    answer: string | undefined,
    onError: (m: string) => void,
  ) => {
    setAddingId(questionId);
    mutations.addQuestion.mutate(
      { questionId, answer },
      {
        onSuccess: () => themedSuccess('Added', 'Question added to your set.'),
        onError: (e) => {
          const code = extractApiError(e).code.toLowerCase();
          if (code === 'question_not_found') {
            void mutations.invalidate();
            onError('That question is no longer available.');
          } else if (code === 'max_questions_reached') {
            resyncLimits();
            onError(`Your question set is full (${maxSet ?? 'limit'} platform questions) — remove one to add another.`);
          } else {
            onError(fieldError(e));
          }
        },
        onSettled: () => setAddingId(null),
      },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: bg, paddingTop: insets.top + 8 }]}>
      {/* Header — back · title+subtitle · Edit Order pill */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>My Question Set</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.editOrderPill,
            { backgroundColor: editingOrder ? bdColors.primary : (isDark ? 'rgba(138,44,255,0.16)' : '#EFE7FF') },
          ]}
          onPress={() => setEditingOrder((e) => !e)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={editingOrder ? 'Done reordering' : 'Edit order'}
        >
          <Ionicons
            name={editingOrder ? 'checkmark' : 'swap-vertical'}
            size={13}
            color={editingOrder ? '#FFF' : bdColors.primary}
          />
          <Text style={[styles.editOrderText, { color: editingOrder ? '#FFF' : bdColors.primary }]}>
            {editingOrder ? 'Done' : 'Edit Order'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={purple} />
        </View>
      ) : isError ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={44} color={purple} />
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>Something went wrong</Text>
          <View style={{ alignSelf: 'stretch', paddingHorizontal: 40 }}>
            <GradientCta label="Retry" onPress={() => refetch()} />
          </View>
        </View>
      ) : (
        <ScrollView
          ref={listScrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
                void refetchConfig();
              }}
              tintColor={purple}
            />
          }
        >
          {/* Settings row */}
          {configuration && (
            <View style={[styles.settingsCard, { backgroundColor: card, borderColor: border }]}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setLangOpen(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="globe-outline" size={17} color={purple} />
                <Text style={[styles.settingsLabel, { color: textPrimary }]}>Question language</Text>
                <Text style={[styles.settingsValue, { color: textMuted }]}>
                  {configuration.supported_languages.find((l) => l.code === configuration.language_code)?.name ??
                    configuration.language_code}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Usage counters vs server limits */}
          {(maxSet != null || maxCustom != null) && (
            <View style={styles.usageRow}>
              {maxSet != null && (
                <View style={[styles.usagePill, { borderColor: platformFull ? '#F59E0B' : border }]}>
                  <Ionicons name="book-outline" size={12} color={platformFull ? '#F59E0B' : textMuted} />
                  <Text style={[styles.usageText, { color: platformFull ? '#F59E0B' : textMuted }]}>
                    Platform questions: {questions.length}/{maxSet}
                  </Text>
                </View>
              )}
              {maxCustom != null && (
                <View style={[styles.usagePill, { borderColor: customFull ? '#F59E0B' : border }]}>
                  <Ionicons name="pencil-outline" size={12} color={customFull ? '#F59E0B' : textMuted} />
                  <Text style={[styles.usageText, { color: customFull ? '#F59E0B' : textMuted }]}>
                    Custom questions: {customQuestions.length}/{maxCustom}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Unified numbered list — platform questions then custom */}
          {totalCount === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.emptyCardText, { color: textMuted }]}>
                No questions yet — browse the catalog or write your own below.
              </Text>
            </View>
          ) : (
            <>
              {questions.map((q, i) => (
                <SetQuestionRow
                  key={q.id}
                  item={q}
                  kind="platform"
                  categoryName={q.category_id ? categoryNames.get(q.category_id) ?? null : null}
                  index={i}
                  total={totalCount}
                  reorderMode={editingOrder}
                  busy={mutations.reorderQuestion.isPending || mutations.removeQuestion.isPending}
                  onEdit={() => setAnswerTarget(q)}
                  onDelete={() => handleDeleteSetQuestion(q)}
                  onMove={(dir) => handleMove(q, i, dir)}
                />
              ))}
              {customQuestions.map((q, i) => (
                <SetQuestionRow
                  key={q.id}
                  item={q}
                  kind="custom"
                  categoryName={null}
                  index={questions.length + i}
                  total={totalCount}
                  reorderMode={editingOrder}
                  busy={mutations.editCustom.isPending || mutations.removeCustom.isPending}
                  onEdit={() => setCustomTarget(q)}
                  onDelete={() => handleDeleteCustom(q)}
                  onMove={(dir) => handleMoveCustom(q, i, dir)}
                />
              ))}
            </>
          )}

          {/* Dashed "Add Another Question" card → expands the two options */}
          <TouchableOpacity
            style={[styles.addDashedCard, { borderColor: bdColors.primaryLight, backgroundColor: isDark ? 'rgba(138,44,255,0.08)' : '#FFF' }]}
            onPress={() => {
              setShowAddOptions((s) => {
                if (!s) {
                  // Cards mount below the fold — scroll down to reveal them.
                  setTimeout(() => listScrollRef.current?.scrollToEnd({ animated: true }), 120);
                }
                return !s;
              });
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAddOptions }}
          >
            <View style={styles.addDashedIcon}>
              <Ionicons name="add" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addDashedTitle, { color: textPrimary }]}>Add Another Question</Text>
              <Text style={[styles.addDashedSub, { color: textMuted }]}>
                Choose from our question library or create your own.
              </Text>
            </View>
            <Ionicons name={showAddOptions ? 'chevron-up' : 'chevron-forward'} size={18} color={bdColors.primaryLight} />
          </TouchableOpacity>

          {/* Two option cards — library / custom */}
          {showAddOptions && (
            <View style={styles.optRow}>
              <TouchableOpacity
                style={[styles.optCard, { backgroundColor: card, borderColor: border }]}
                onPress={() => setCatalogOpen(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={[styles.optIcon, { backgroundColor: isDark ? 'rgba(138,44,255,0.16)' : '#EFE7FF' }]}>
                  <Ionicons name="book" size={20} color={bdColors.primary} />
                </View>
                <Text style={[styles.optTitle, { color: textPrimary }]}>Browse Question Library</Text>
                <Text style={[styles.optSub, { color: platformFull ? '#F59E0B' : textMuted }]}>
                  {platformFull
                    ? `Question set full (${questions.length}/${maxSet}) — remove a question to add another.`
                    : 'Explore curated questions across different categories.'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={bdColors.primaryLight} style={styles.optChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optCard,
                  { backgroundColor: card, borderColor: border },
                  customFull && styles.optCardDisabled,
                ]}
                onPress={() => setCustomTarget('new')}
                disabled={customFull}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: customFull }}
              >
                <View style={[styles.optIcon, { backgroundColor: isDark ? 'rgba(138,44,255,0.16)' : '#F2E7FF' }]}>
                  <Ionicons name="pencil" size={20} color={purple} />
                </View>
                <Text style={[styles.optTitle, { color: textPrimary }]}>Create Your Own Question</Text>
                <Text style={[styles.optSub, { color: customFull ? '#F59E0B' : textMuted }]}>
                  {customFull
                    ? `Custom questions are full (${customQuestions.length}/${maxCustom}) — remove one to add another.`
                    : 'Add a custom question to make your Blind Date unique.'}
                </Text>
                {!customFull && (
                  <Ionicons name="chevron-forward" size={16} color={bdColors.primaryLight} style={styles.optChevron} />
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.hint, { color: textMuted, marginTop: 18 }]}>
            {configuration?.limits?.max_round_questions != null
              ? `When you start a Blind Date, you pick up to ${configuration.limits.max_round_questions} questions from this set for participants to answer.`
              : 'When you start a Blind Date, you pick questions from this set for participants to answer.'}
          </Text>
        </ScrollView>
      )}

      {/* Modals */}
      <AnswerSheet
        target={answerTarget}
        onClose={() => setAnswerTarget(null)}
        onSave={handleSaveAnswer}
        saving={mutations.updateAnswer.isPending}
      />
      <CustomQuestionSheet
        target={customTarget}
        onClose={() => setCustomTarget(null)}
        onCreate={handleCreateCustom}
        onEdit={handleEditCustom}
        saving={mutations.addCustom.isPending || mutations.editCustom.isPending}
      />
      <CatalogSheet
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        language={language}
        inSetIds={inSetIds}
        setFull={platformFull}
        onAdd={handleAddFromCatalog}
        addingId={addingId}
      />
      <LanguageSheet
        visible={langOpen}
        onClose={() => setLangOpen(false)}
        languages={configuration?.supported_languages ?? []}
        current={language}
        onPick={(code) =>
          mutations.patchConfig.mutate(
            { languageCode: code },
            {
              onError: (e) => {
                const { code: c } = extractApiError(e);
                err(
                  c.toLowerCase() === 'unsupported_language'
                    ? 'That language is not supported yet.'
                    : fieldError(e),
                );
              },
            },
          )
        }
      />

      {/* Shared Blind Date nav — question sets live under the Hosted tab */}
      <BlindDateBottomNav
        activeTab="mine"
        onHome={() => router.replace('/(app)/(tabs)' as never)}
        onExplore={() => router.replace('/(app)/blind-date' as never)}
        onMine={() =>
          router.replace({
            pathname: '/(app)/blind-date' as never,
            params: { tab: 'mine' },
          })
        }
        onJoined={() =>
          router.replace({
            pathname: '/(app)/blind-date' as never,
            params: { tab: 'participating' },
          })
        }
        onProfile={() => router.push('/(app)/(tabs)/profile' as never)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },

  editOrderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editOrderText: { fontSize: 12.5, fontWeight: '800' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },


  settingsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 18, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  settingsValue: { fontSize: 13 },

  usageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  usageText: { fontSize: 12, fontWeight: '600' },

  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  emptyCardText: { fontSize: 13, lineHeight: 18 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },

  // ── Question card ──────────────────────────────────────────────────────────
  qRow: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  qTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  numCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  numCircleText: { fontSize: 14, fontWeight: '800' },
  qText: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  qMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  catTagText: { fontSize: 12, fontWeight: '700' },
  unansweredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unansweredText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  viewAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  viewAnswerText: { color: bdColors.primaryLight, fontSize: 12.5, fontWeight: '700' },
  qActionRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  qActionBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qActionDivider: { width: StyleSheet.hairlineWidth, height: 20 },
  answerPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  answerPanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  answerPanelLabel: { flex: 1, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  answerPanelEdit: { fontSize: 12.5, fontWeight: '700' },
  answerPanelText: { fontSize: 14.5, lineHeight: 21 },

  addDashedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  addDashedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: bdColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDashedTitle: { fontSize: 15, fontWeight: '800' },
  addDashedSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },

  optRow: { flexDirection: 'row', gap: 10 },
  optCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  optIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optTitle: { fontSize: 13.5, fontWeight: '800', lineHeight: 18 },
  optSub: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  optChevron: { position: 'absolute', top: 14, right: 12 },
  optCardDisabled: { opacity: 0.55 },

  setFullHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  setFullHintText: { color: '#F59E0B', fontSize: 12, fontWeight: '600', flex: 1 },

  // Sheets
  backdrop: { flex: 1, backgroundColor: 'rgba(6,3,14,0.55)' },
  sheetAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(140,140,160,0.4)',
    marginBottom: 14,
  },
  sheetClose: { position: 'absolute', top: 14, right: 16, zIndex: 10, elevation: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2, marginBottom: 10 },
  sheetQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 21, marginBottom: 12 },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },
  fieldError: { color: '#EF4444', fontSize: 12.5, fontWeight: '600', marginTop: 8 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 10 },

  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
    overflow: 'hidden',
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // Catalog sheet
  catalogBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,3,14,0.55)' },
  catalogSheet: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  catalogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catalogSub: { fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  // Catalog accordion
  accCard: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  accIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accIconImg: { width: 20, height: 20 },
  accName: { flex: 1, fontSize: 14.5, fontWeight: '800' },
  accCount: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2 },
  accCountText: { fontSize: 11.5, fontWeight: '800' },
  accBody: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingBottom: 10 },
  accErr: { alignItems: 'center', paddingVertical: 14, gap: 8 },
  accQRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
  },
  accQText: { flex: 1, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  accQExpand: { paddingLeft: 30, paddingBottom: 8 },
  // Custom question composer (full screen)
  customScreen: { flex: 1 },
  customHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customTitle: { fontSize: 17, fontWeight: '800' },
  customCancel: { fontSize: 14, fontWeight: '700' },
  customSub: { fontSize: 13.5, textAlign: 'center', marginBottom: 16 },
  customHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  customHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: bdColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customHeroTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  customHeroSub: { fontSize: 12.5, lineHeight: 18 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  customTips: {
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  customTipsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  customTipsTitle: { fontSize: 14.5, fontWeight: '800' },
  customTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  customTipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  customCancelBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  customCancelBtnText: { fontSize: 15, fontWeight: '700' },
  addedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addedPillText: { color: '#22C55E', fontSize: 11, fontWeight: '800' },
  catalogEmpty: { alignItems: 'center', marginTop: 50, gap: 10 },
  catalogEmptyText: { fontSize: 13 },

  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  langText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
