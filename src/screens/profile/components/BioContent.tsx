import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BioContentProps {
  bio: string;
  onAddBio?: () => void;
}

export default function BioContent({ bio, onAddBio }: BioContentProps) {
  const { colors: th } = useTheme();
  const hasBio = bio?.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        {hasBio ? (
          <Text style={[styles.text, { color: th.text }]}>{bio}</Text>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: th.textSecondary }]}>No bio</Text>
            {onAddBio && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={onAddBio}
                activeOpacity={0.8}
                accessibilityLabel="Add bio"
                accessibilityRole="button"
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add bio</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
