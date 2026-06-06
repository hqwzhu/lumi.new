// Notification service — fetch/clear persisted notifications via REST API

import type { NotificationListResponse } from '@/types/api';

export async function fetchNotifications(): Promise<NotificationListResponse> {
  const res = await fetch('/api/notifications', { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return res.json();
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; marked: number }> {
  const res = await fetch('/api/notifications/read-all', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to mark notifications read: ${res.status}`);
  return res.json();
}

export async function clearAllNotifications(): Promise<{ success: boolean }> {
  const res = await fetch('/api/notifications', {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to clear notifications: ${res.status}`);
  return res.json();
}
