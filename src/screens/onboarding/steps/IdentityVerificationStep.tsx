import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getManualReviewStatus, requestManualReview, submitIdentityVerification } from '@/api/profile/profileApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useNotificationPermission } from '@/hooks/notifications/useNotificationPermission';
import { useTheme } from '@/hooks/use-theme';
import type { IdentityVerificationStatus } from '@/types/billing';
import { extractApiError } from '@/utils/apiError';
import { processSelfieForVerification } from '@/utils/imageProcessor';

type Props = {
  onComplete: () => Promise<void>;
  isCompleted: boolean;
  identity_verification_required: boolean;
  onGoBackToPhoto: () => void;
  verificationStatus?: IdentityVerificationStatus;
};

type Phase = 'camera' | 'preview' | 'verifying' | 'success' | 'failed';

// ─── SelfieCamera: live front-camera with face guide overlay ──────────────────

interface SelfieCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

function SelfieCamera({ onCapture, onClose }: SelfieCameraProps) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch {
      // ignore capture errors
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, isCapturing, onCapture]);

  // Permission loading
  if (!permission) {
    return (
      <View style={camStyles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={camStyles.center}>
        <Ionicons name="camera-outline" size={48} color={th.textMuted} />
        <Text style={[camStyles.permissionText, { color: th.text }]}>
          {t('onboarding.identity.cameraPermission', 'Camera access is required to capture a selfie.')}
        </Text>
        <TouchableOpacity
          style={[camStyles.grantBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={camStyles.grantBtnText}>
            {t('onboarding.identity.grantPermission', 'Grant Camera Access')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[camStyles.closeBtn, { borderColor: th.border, borderWidth: 1 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[camStyles.closeBtnText, { color: th.textSecondary }]}>
            {t('onboarding.identity.skipCamera', 'Cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={camStyles.container}>
      {/* Camera preview — fills the selfie box */}
      <CameraView
        ref={cameraRef}
        style={camStyles.camera}
        facing="front"
        mirror
        mode="picture"
        animateShutter
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Face guide overlay */}
      <View style={camStyles.overlay} pointerEvents="none">
        {/* Darkened border area with transparent oval cutout */}
        <View style={camStyles.faceGuideBorder} />

        {/* Guide text above the oval */}
        <View style={camStyles.guideTextWrap}>
          <Ionicons name="person-outline" size={20} color="#FFFFFF" />
          <Text style={camStyles.guideText}>
            {t('onboarding.identity.faceGuide', 'Align your face inside the oval')}
          </Text>
        </View>
      </View>

      {/* Capture button */}
      <View style={camStyles.captureRow}>
        <TouchableOpacity
          style={[
            camStyles.captureBtn,
            (!isCameraReady || isCapturing) && { opacity: 0.4 },
          ]}
          onPress={handleCapture}
          disabled={!isCameraReady || isCapturing}
          activeOpacity={0.85}
          accessibilityLabel="Capture selfie"
          accessibilityRole="button"
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <View style={camStyles.captureInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={camStyles.closeCameraBtn}
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityLabel="Close camera"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const camStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // Darkened border with transparent oval — simulated via a bordered View
  faceGuideBorder: {
    width: 240,
    height: 300,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: '#6C3483',
    backgroundColor: 'transparent',
    marginTop: 90,
  },
  guideTextWrap: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  captureRow: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 30,
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  grantBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  grantBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// ─── IdentityVerificationStep ─────────────────────────────────────────────────

type SubmitState = 'idle' | 'verifying' | 'success' | 'failed';

export default function IdentityVerificationStep({
  onComplete,
  isCompleted,
  identity_verification_required,
  onGoBackToPhoto,
  verificationStatus: initialVerificationStatus,
}: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { isGranted: notificationsGranted, requestPermission: requestNotifications } = useNotificationPermission();

  const [showCamera, setShowCamera] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(
    initialVerificationStatus === 'VERIFIED' || isCompleted ? 'success' : 'idle',
  );
  // Only carry over persistent states from the backend (VERIFIED, MANUAL_REVIEW).
  // For FAILED/NOT_STARTED, start fresh so the user sees a clean screen on restart.
  const [verificationStatus, setVerificationStatus] = useState<IdentityVerificationStatus | null>(
    initialVerificationStatus === 'VERIFIED' || initialVerificationStatus === 'MANUAL_REVIEW'
      ? initialVerificationStatus
      : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reviewerNote, setReviewerNote] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusCheckResult, setStatusCheckResult] = useState<string | null>(null);

  // On mount and when status becomes MANUAL_REVIEW, fetch latest review state.
  // Also poll every 45 seconds while the user is on the waiting screen.
  useEffect(() => {
    if (verificationStatus !== 'MANUAL_REVIEW') return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const status = await getManualReviewStatus();
        if (cancelled) return;
        if (status.submitted_at) setSubmittedAt(status.submitted_at);
        if (status.verification_status === 'VERIFIED') {
          setVerificationStatus('VERIFIED');
          setReviewerNote(status.reviewer_note ?? null);
          setMessage(status.reviewer_note || t('onboarding.identity.reviewApproved', 'Your identity has been verified by manual review.'));
          setSubmitState('success');
          // Auto-advance to the next step after manual review approval.
          try { await onComplete(); } catch { /* user can press Continue manually */ }
        } else if (status.verification_status === 'FAILED') {
          setVerificationStatus('FAILED');
          setReviewerNote(status.reviewer_note ?? null);
          setErrorCode(null);
          setMessage(status.reviewer_note || t('onboarding.identity.reviewRejected', 'Your manual review was rejected. Please try again.'));
          setSubmitState('failed');
        }
      } catch {
        // Silently ignore — user is already on the under-review screen
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [verificationStatus, t, onComplete]);

  const handleCapture = useCallback(async (uri: string) => {
    setShowCamera(false);
    setSubmitState('idle');
    setVerificationStatus(null);
    setMessage(null);
    setErrorCode(null);
    setError(null);
    try {
      const processed = await processSelfieForVerification(uri);
      setSelfieUri(processed.uri);
    } catch {
      // Fall back to the raw capture URI if conversion fails
      setSelfieUri(uri);
    }
  }, []);

  const handleAutomatedVerify = useCallback(async () => {
    if (!selfieUri) {
      setError('Please capture a selfie first.');
      return;
    }
    setError(null);
    setSubmitState('verifying');
    try {
      const fileName = selfieUri.split('/').pop() ?? 'selfie.jpg';
      const response = await submitIdentityVerification(selfieUri, fileName, 'image/jpeg');
      setVerificationStatus(response.verification_status);
      setErrorCode(null);

      if (response.verification_status === 'VERIFIED') {
        setMessage(response.message);
        setSubmitState('success');
        // Auto-advance to the next step after successful verification.
        try { await onComplete(); } catch { /* user can press Continue manually */ }
      } else if (response.verification_status === 'FAILED' && response.error_code) {
        setErrorCode(response.error_code.toLowerCase());
        setMessage(response.message);
        setSubmitState('failed');
      } else {
        setMessage(response.message);
        setSubmitState('failed');
      }
    } catch (err: unknown) {
      const detail = extractApiError(err);
      setErrorCode((detail.code ?? '').toLowerCase());
      setMessage(detail.message);
      setVerificationStatus('FAILED');
      setSubmitState('failed');
    }
  }, [selfieUri, onComplete]);

  const handleRetake = useCallback(() => {
    setSelfieUri(null);
    setSubmitState('idle');
    setVerificationStatus(null);
    setMessage(null);
    setErrorCode(null);
    setError(null);
    setShowCamera(true);
  }, []);

  const handleRequestManualReview = useCallback(async () => {
    if (!selfieUri) {
      setError('Please capture a selfie first.');
      return;
    }
    setError(null);
    setErrorCode(null);
    setSubmitState('verifying');
    try {
      const fileName = selfieUri.split('/').pop() ?? 'selfie.jpg';
      const response = await requestManualReview(selfieUri, fileName, 'image/jpeg');
      setVerificationStatus(response.verification_status);

      if (response.verification_status === 'FAILED' && response.error_code) {
        setErrorCode(response.error_code.toLowerCase());
        setMessage(response.message);
      } else {
        setMessage(response.message);
      }
      setSubmitState('failed');
    } catch (err: unknown) {
      const detail = extractApiError(err);
      setErrorCode((detail.code ?? '').toLowerCase());
      setMessage(detail.message);
      setSubmitState('failed');
    }
  }, [selfieUri]);

  const handleContinue = useCallback(async () => {
    setError(null);
    try {
      await onComplete();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [onComplete]);

  const isBusy = submitState === 'verifying';
  const isUnderReview = verificationStatus === 'MANUAL_REVIEW';
  const isVerified = verificationStatus === 'VERIFIED' || (isCompleted && !verificationStatus);

  // If required: must be VERIFIED (or already completed) to continue.
  // If optional: always can continue (unless under manual review).
  const canContinue = identity_verification_required
    ? submitState === 'success' || isCompleted
    : !isUnderReview;

  // ── Full-screen camera mode ─────────────────────────────────────────────
  if (showCamera) {
    return (
      <View style={[styles.cameraContainer, { backgroundColor: '#000' }]}>
        <SelfieCamera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      </View>
    );
  }

  // ── Manual review waiting screen (only for mandatory verification) ──────
  if (isUnderReview && identity_verification_required) {
    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.reviewWaitContainer}>
          <View style={[styles.reviewWaitIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="hourglass-outline" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: th.text, textAlign: 'center' }]}>
            {t('onboarding.identity.reviewWaitTitle', 'Identity Under Review')}
          </Text>
          <Text style={[styles.subtitle, { color: th.textSecondary, textAlign: 'center' }]}>
            {t(
              'onboarding.identity.reviewWaitBody',
              'Your identity is currently under manual review by our team. This process usually takes 24-48 hours. We will notify you as soon as the review is complete.',
            )}
          </Text>

          {!notificationsGranted && (
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  borderColor: th.border,
                  borderWidth: 1,
                  marginTop: spacing.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                },
              ]}
              onPress={requestNotifications}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={18} color={th.text} />
              <Text style={[styles.secondaryBtnText, { color: th.text }]}>
                {t('onboarding.identity.turnOnNotifications', 'Turn On Notifications')}
              </Text>
            </TouchableOpacity>
          )}
          {notificationsGranted && (
            <View style={[styles.statusCard, { backgroundColor: `${colors.success}15`, marginTop: spacing.md }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                {t('onboarding.identity.notificationsOn', 'Notifications are on. We will notify you when your review is complete.')}
              </Text>
            </View>
          )}

          {submittedAt && (
            <Text style={[styles.submittedText, { color: th.textMuted }]}>
              {t('onboarding.identity.submittedOn', 'Submitted on {{date}}', { date: new Date(submittedAt).toLocaleDateString() })}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                borderColor: th.border,
                borderWidth: 1,
                marginTop: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              },
            ]}
            onPress={async () => {
              setIsCheckingStatus(true);
              setStatusCheckResult(null);
              try {
                const status = await getManualReviewStatus();
                if (status.submitted_at) setSubmittedAt(status.submitted_at);
                if (status.verification_status === 'VERIFIED') {
                  setVerificationStatus('VERIFIED');
                  setReviewerNote(status.reviewer_note ?? null);
                  setMessage(status.reviewer_note || t('onboarding.identity.reviewApproved', 'Your identity has been verified by manual review.'));
                  setSubmitState('success');
                  // Auto-advance to the next step after manual review approval.
                  try { await onComplete(); } catch { /* user can press Continue manually */ }
                } else if (status.verification_status === 'FAILED') {
                  setVerificationStatus('FAILED');
                  setReviewerNote(status.reviewer_note ?? null);
                  setErrorCode(null);
                  setMessage(status.reviewer_note || t('onboarding.identity.reviewRejected', 'Your manual review was rejected. Please try again.'));
                  setSubmitState('failed');
                } else {
                  setStatusCheckResult(t('onboarding.identity.stillUnderReview', 'Your review is still pending. Please check again later.'));
                  setTimeout(() => setStatusCheckResult(null), 10000);
                }
              } catch {
                setStatusCheckResult(t('onboarding.identity.statusCheckError', 'Could not check status. Please try again.'));
                setTimeout(() => setStatusCheckResult(null), 10000);
              } finally {
                setIsCheckingStatus(false);
              }
            }}
            disabled={isCheckingStatus}
            activeOpacity={0.8}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color={th.text} size="small" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={18} color={th.text} />
                <Text style={[styles.secondaryBtnText, { color: th.text }]}>
                  {t('onboarding.identity.checkStatus', 'Check Status')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {statusCheckResult && (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(255,179,0,0.10)', marginTop: spacing.sm }]}>
              <Ionicons name="information-circle-outline" size={20} color="#FFB300" />
              <Text style={[styles.statusText, { color: '#FFB300' }]}>
                {statusCheckResult}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                marginTop: spacing.xl,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                minWidth: 220,
              },
            ]}
            onPress={() => {
              setVerificationStatus(null);
              setErrorCode(null);
              setMessage(null);
              setSubmitState('idle');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>
              {t('onboarding.identity.retryVerification', 'Retry Automatic Verification')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: th.text }]}>
        {t('onboarding.identity.title', 'Verify Your Identity')}
      </Text>
      <Text style={[styles.subtitle, { color: th.textSecondary }]}>
        {identity_verification_required
          ? t(
              'onboarding.identity.subtitleRequired',
              'Identity verification is required in your region. Take a selfie so we can confirm you are real.',
            )
          : t(
              'onboarding.identity.subtitleOptional',
              'Take a selfie so we can confirm you are real. This helps keep Qaliye safe. This step is optional.',
            )}
      </Text>

      {/* ── Selfie preview / capture prompt ──────────────────────────────── */}
      {isVerified ? (
        <View style={[styles.verifiedWrap, { backgroundColor: `${colors.success}10` }]}>
          <Ionicons name="shield-checkmark" size={64} color={colors.success} />
          <Text style={[styles.verifiedText, { color: colors.success }]}>
            {t('onboarding.identity.alreadyVerified', 'You are already verified')}
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.selfieWrap, { backgroundColor: th.surface, borderColor: th.border }]}>
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.selfieImage} resizeMode="cover" />
            ) : (
              <View style={[styles.selfiePlaceholder, { backgroundColor: th.backgroundElement }]}>
                <Ionicons name="camera-outline" size={56} color={th.textMuted} />
                <Text style={[styles.placeholderText, { color: th.textMuted }]}>
                  {t('onboarding.identity.noSelfie', 'No selfie captured')}
                </Text>
                <Text style={[styles.placeholderSubText, { color: th.textMuted }]}>
                  {t('onboarding.identity.tapToCapture', 'Tap below to take a selfie')}
                </Text>
              </View>
            )}
          </View>

          {/* ── Capture / Retake button ──────────────────────────────────── */}
          {selfieUri ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: th.border, borderWidth: 1 }]}
              onPress={handleRetake}
              disabled={isBusy || isUnderReview}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color={th.text} />
              <Text style={[styles.secondaryBtnText, { color: th.text }]}>
                {t('onboarding.identity.retake', 'Retake Selfie')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCamera(true)}
              disabled={isBusy || isUnderReview}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>
                {t('onboarding.identity.takeSelfie', 'Take Selfie')}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Verify button ──────────────────────────────────────────────────── */}
      {selfieUri && submitState !== 'success' && !isUnderReview && (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleAutomatedVerify}
          disabled={!selfieUri || isBusy}
          activeOpacity={0.85}
        >
          {submitState === 'verifying' ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>
                {t('onboarding.identity.verifyNow', 'Verify Now')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ── Status messages ─────────────────────────────────────────────────── */}
      {verificationStatus === 'VERIFIED' && (
        <View style={[styles.statusCard, { backgroundColor: `${colors.success}15` }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={[styles.statusText, { color: colors.success }]}>
            {message || t('onboarding.identity.verified', 'Identity verified successfully!')}
          </Text>
        </View>
      )}
      {verificationStatus === 'FAILED' && (
        <View style={[styles.statusCard, { backgroundColor: `${colors.danger}15` }]}>
          <Ionicons name="close-circle" size={24} color={colors.danger} />
          <Text style={[styles.statusText, { color: colors.danger }]}>
            {errorCode
              ? t(`onboarding.identity.errors.${errorCode}`, message || t('onboarding.identity.failed', 'Verification failed. Please try again.'))
              : message || t('onboarding.identity.failed', 'Verification failed. Please try again.')}
          </Text>
        </View>
      )}
      {verificationStatus === 'MANUAL_REVIEW' && (
        <View style={[styles.statusCard, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="hourglass-outline" size={24} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {message || t(
              'onboarding.identity.underReview',
              'Your identity is under manual review. This usually takes 24-48 hours. We will notify you when it is complete.',
            )}
          </Text>
        </View>
      )}
      {verificationStatus === 'FAILED' && (
        <View style={styles.failureActions}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                flex: 1,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              },
            ]}
            onPress={onGoBackToPhoto}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>
              {t('onboarding.identity.changePhoto', 'Change Profile Photo')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {verificationStatus === 'FAILED' && (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              minWidth: 220,
            },
          ]}
          onPress={handleRequestManualReview}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-outline" size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>
            {t('onboarding.identity.requestManualReview', 'Request Manual Review')}
          </Text>
        </TouchableOpacity>
      )}

      {error && (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      )}

      {/* ── Continue ────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.primary, marginTop: spacing.lg },
          !canContinue && { opacity: 0.4 },
        ]}
        onPress={handleContinue}
        disabled={!canContinue || isBusy}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {identity_verification_required
            ? t('onboarding.continue', 'Continue')
            : t('onboarding.identity.verifyLater', 'Verify Later')}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </TouchableOpacity>

      {identity_verification_required && submitState !== 'success' && !isCompleted && (
        <Text style={[styles.noticeText, { color: th.textMuted }]}>
          {t(
            'onboarding.identity.requiredNotice',
            'Identity verification is required in your region before you can continue.',
          )}
        </Text>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
  },
  reviewWaitContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  reviewWaitIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  failureActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selfieWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    maxWidth: 280,
  },
  verifiedWrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  verifiedText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  selfiePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  placeholderSubText: {
    fontSize: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  noticeText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  submittedText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
