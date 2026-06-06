// Conversation service — manages chat conversation lifecycle via REST API

import type { Conversation, ConversationListResponse, ConversationMessagesResponse, ConversationActiveResponse } from '@/types/api';

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
  return res.json();
}

export async function getMessages(conversationId: string, limit: number = 100): Promise<ConversationMessagesResponse> {
  const res = await fetch(`/api/conversations/${conversationId}/messages?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
  return res.json();
}

export async function closeConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}/close`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to close conversation: ${res.status}`);
}

export async function getActiveConversation(): Promise<ConversationActiveResponse | null> {
  const res = await fetch('/api/conversations/active');
  if (!res.ok) return null;
  return res.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}
