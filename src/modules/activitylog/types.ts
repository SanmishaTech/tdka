export interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes?: string | null;
  createdAt: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLog[];
  page: number;
  totalPages: number;
  totalLogs: number;
}
