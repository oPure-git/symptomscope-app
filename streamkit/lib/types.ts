export interface BaseEvent {
  id: string;
  timestamp: number;
}

export interface FollowEvent extends BaseEvent {
  type: 'follow';
  username: string;
}

export interface SubEvent extends BaseEvent {
  type: 'sub';
  username: string;
  tier: '1000' | '2000' | '3000';
  months?: number;
  gifted?: boolean;
  giftedBy?: string;
  message?: string;
}

export interface RaidEvent extends BaseEvent {
  type: 'raid';
  username: string;
  viewerCount: number;
}

export interface CheerEvent extends BaseEvent {
  type: 'cheer';
  username: string;
  bits: number;
  message?: string;
}

export interface DonationEvent extends BaseEvent {
  type: 'donation';
  username: string;
  amount: number;
  currency: string;
  message?: string;
}

export interface ChatMessage extends BaseEvent {
  type: 'chat';
  username: string;
  color: string;
  message: string;
  badges: Array<{ type: string; label: string; color: string }>;
}

export interface GoalUpdate extends BaseEvent {
  type: 'goal_update';
  goalType: 'followers' | 'subs';
  current: number;
  target: number;
  label: string;
}

export type LabelType =
  | 'recent_follow'
  | 'latest_sub'
  | 'top_cheerer'
  | 'latest_donation'
  | 'session_follows'
  | 'session_subs';

export interface LabelUpdate extends BaseEvent {
  type: 'label_update';
  labelType: LabelType;
  value: string;
}

export type StreamEvent =
  | FollowEvent
  | SubEvent
  | RaidEvent
  | CheerEvent
  | DonationEvent
  | ChatMessage
  | GoalUpdate
  | LabelUpdate;

export type StreamEventType = StreamEvent['type'];
