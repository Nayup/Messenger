const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('messenger_token');
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // If token is expired/invalid, clear auth and redirect to login
    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      localStorage.removeItem('messenger_token');
      localStorage.removeItem('messenger_user');
      window.location.href = '/login';
      throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ==================== AUTH ====================

export async function loginAPI(username: string, password: string) {
  const data = await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return data as { token: string; username: string; userId: string };
}

export async function registerAPI(username: string, email: string, password: string) {
  const data = await fetchWithAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  return data as { token: string; username: string; userId: string };
}

// ==================== USERS ====================

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export async function fetchUsers(): Promise<UserDTO[]> {
  return fetchWithAuth('/api/users');
}

export async function searchUsersAPI(q: string): Promise<UserDTO[]> {
  return fetchWithAuth(`/api/users/search?q=${encodeURIComponent(q)}`);
}

// ==================== CHATS ====================

export interface ChatDTO {
  id: string;
  name: string;
  type: string;
  lastMessage: string;
  lastMessageTime: string;
  otherUser: UserDTO | null;
}

export async function fetchChats(): Promise<ChatDTO[]> {
  return fetchWithAuth('/api/chats');
}

export async function createPrivateChat(otherUsername: string) {
  return fetchWithAuth('/api/chats/private', {
    method: 'POST',
    body: JSON.stringify({ otherUsername }),
  });
}

// ==================== MESSAGES ====================

export interface MessageFromAPI {
  id: string;
  content: string;
  messageType: string;
  sentAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  chat: {
    id: string;
  };
}

export async function fetchMessages(chatId: string): Promise<MessageFromAPI[]> {
  return fetchWithAuth(`/api/chats/${chatId}/messages`);
}
