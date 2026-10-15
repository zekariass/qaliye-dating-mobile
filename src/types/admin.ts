// ─── Admin / Moderation API DTOs ───────────────────────────────────────────────
// All keys are snake_case to match the backend JSON.

export type AiDetectionAction = 'ADVISE_ONLY' | 'MANUAL_REVIEW' | 'REJECTED';

export type PhotoModerationItemDto = {
  id: string;
  user_id: string;
  image_url: string;
  moderation_status: 'MANUAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING';
  created_at: string;
  display_name: string;
  ai_generated_detected: boolean | null;
  ai_generated_confidence: number | null;
  ai_detected_generator: string | null;
  ai_detection_action: AiDetectionAction | null;
};

export type ModerationDecision = 'APPROVED' | 'REJECTED';

export type ModerationQueueResponse = {
  items: PhotoModerationItemDto[];
};
