// Shapes returned by the Kinwhim API (see app/api/* in the web project).

export type Circle = {
  id: string;
  name: string;
  inviteCode: string;
  inviteUrl?: string;
  ownerId: string;
  revealHour: number;
  timezone: string;
  style: string;
};

export type Member = {
  id: string;
  name: string;
  role: "owner" | "member";
  checkinId: string | null;
  checkedIn: boolean;
  photoUrl: string | null;
  mood: string | null;
  caption: string | null;
  consentTransform: boolean;
  blocked: boolean;
};

export type Memory = {
  id: string;
  day: string;
  mediaUrl: string;
  kind: string;
  title: string;
  createdAt: number;
  reactions: string[];
  isRead: boolean;
  featuresViewer: boolean;
};

export type Viewer = { id: string; name: string; email: string; needsTerms: boolean };

export type Dashboard = {
  viewer: Viewer;
  circles: Circle[];
  circle: Circle | null;
  today?: string;
  members: Member[];
  memories: Memory[];
  unreadCount: number;
  badgeCount: number;
  termsVersion: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  needsTerms: boolean;
};

export type ReportTarget = { targetType: "memory" | "photo" | "user"; targetId: string; userId?: string; label: string };
