import { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/constants/theme';

type ChapaCheckoutModalProps = {
  visible: boolean;
  checkoutUrl: string;
  returnUrl: string;
  onClose: () => void;
  onReturned: () => void;
};

export function ChapaCheckoutModal({
  visible,
  checkoutUrl,
  returnUrl,
  onClose,
  onReturned,
}: ChapaCheckoutModalProps) {
  const [loading, setLoading] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete payment</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>Close</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          {loading && (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          )}

          <WebView
            source={{ uri: checkoutUrl }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url;

              if (url.startsWith(returnUrl)) {
                onReturned();
                return false;
              }

              if (
                !url.startsWith('https://') &&
                !url.startsWith('http://') &&
                !url.startsWith('about:')
              ) {
                Linking.openURL(url).catch(() => {});
                return false;
              }

              return true;
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 16,
    paddingTop: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: { fontSize: 16, color: colors.primary },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    zIndex: 1,
  },
});
