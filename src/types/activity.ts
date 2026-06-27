export type ActivityStatus = 'ONLINE' | 'RECENTLY_ACTIVE' | 'OFFLINE' | 'HIDDEN';

export interface HeartbeatResponse {
  activity_status: ActivityStatus;
  show_activity_status: boolean;
}

export interface ActivityVisibilityResponse {
  show_activity_status: boolean;
  activity_status: ActivityStatus;
}

export interface BatchStatusRequest {
  user_ids: string[];
}

export interface BatchStatusItem {
  user_id: string;
  activity_status: ActivityStatus;
}

export interface BatchStatusResponse {
  items: BatchStatusItem[];
}
