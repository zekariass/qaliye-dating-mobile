import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import ProfileCard, { CardDto, ProfileCardHandle } from './ProfileCard';

// ── Types ────────────────────────────────────────────────────────────────────

export type SwipeDirection = 'LIKE' | 'PASS';

export interface CardStackHandle {
  triggerSwipe: (direction: SwipeDirection) => void;
}

interface Props {
  cards:            CardDto[];
  onSwipe:          (direction: SwipeDirection, card: CardDto) => void;
  animateTopCardIn?: SwipeDirection | false;
  topActions?:      ReactNode;
  topRightActions?: ReactNode;
  /**
   * Shared vertical scroll offset of the containing ScrollView (if any).
   * The top card's right-side action buttons counter-translate by this
   * amount so they stay pinned on screen while the card scrolls beneath them.
   */
  scrollY?:         SharedValue<number>;
}

// ── Layout constants ─────────────────────────────────────────────────────────

const MAX_VISIBLE = 2; // keep next card ready underneath for seamless swipe

// ── Component ────────────────────────────────────────────────────────────────

const CardStack = forwardRef<CardStackHandle, Props>(
  function CardStack({ cards, onSwipe, animateTopCardIn = false, topActions, topRightActions, scrollY }, ref) {
    const topCardRef = useRef<ProfileCardHandle>(null);

    useImperativeHandle(ref, () => ({
      triggerSwipe: (dir) => topCardRef.current?.swipeOut(dir),
    }));

    // Guard undefined/invalid entries; keep top MAX_VISIBLE; reverse so top
    // card renders last and therefore sits above the others in the z-order.
    const visible = (cards ?? [])
      .filter((c): c is CardDto => {
        if (c == null || typeof c.user_id !== 'string' || !c.user_id) {
          if (__DEV__) {
            console.warn('[CardStack] skipping invalid card', c);
          }
          return false;
        }
        return true;
      })
      .slice(0, MAX_VISIBLE)
      .reverse();

    return (
      <View style={styles.container}>
        {visible.map((card, idx) => {
          const isTop = idx === visible.length - 1;

          return (
            <View
              key={card.user_id || `card-${idx}`}
              style={[
                styles.cardWrap,
                { zIndex: idx },
              ]}
              pointerEvents={isTop ? 'auto' : 'none'}
            >
              <ProfileCard
                ref={isTop ? topCardRef : null}
                card={card}
                isTop={isTop}
                onSwipe={(dir) => onSwipe(dir, card)}
                animateIn={isTop ? animateTopCardIn : false}
                actions={isTop ? topActions : undefined}
                rightActions={isTop ? topRightActions : undefined}
                scrollY={scrollY}
              />
            </View>
          );
        })}
      </View>
    );
  },
);

export default CardStack;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  cardWrap: {
    position: 'absolute',
    top:    0,
    bottom: 0,
    left:   0,
    right:  0,
  },
});
