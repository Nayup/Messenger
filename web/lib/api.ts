const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('messenger_token');
}

// Flag to prevent multiple simultaneous auth redirects
let isRedirectingToLogin = false;

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
    // Nếu token hết hạn/không hợp lệ — chỉ logout cho protected endpoints
    // Không logout khi gọi auth endpoints (login/register)
    const isAuthEndpoint = url.startsWith('/api/auth/');
    if ((res.status === 401 || res.status === 403) && !isAuthEndpoint && typeof window !== 'undefined') {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true;
        localStorage.removeItem('messenger_token');
        localStorage.removeItem('messenger_user');
        window.location.href = '/login';
      }
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

export interface MemberDTO {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export interface ChatDTO {
  id: string;
  name: string;
  type: 'PRIVATE' | 'GROUP';
  lastMessage: string;
  lastMessageTime: string;
  otherUser: UserDTO | null;
  // Group chat fields
  members: MemberDTO[] | null;
  memberCount: number;
  avatarUrl: string | null;
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

// ==================== GROUP CHAT ====================

export async function createGroupChat(groupName: string, memberUsernames: string[]): Promise<ChatDTO> {
  return fetchWithAuth('/api/chats/group', {
    method: 'POST',
    body: JSON.stringify({ groupName, memberUsernames }),
  });
}

export async function renameGroup(chatId: string, newName: string): Promise<ChatDTO> {
  return fetchWithAuth(`/api/chats/${chatId}/name`, {
    method: 'PUT',
    body: JSON.stringify({ newName }),
  });
}

export async function addGroupMembers(chatId: string, usernames: string[]): Promise<ChatDTO> {
  return fetchWithAuth(`/api/chats/${chatId}/members`, {
    method: 'POST',
    body: JSON.stringify({ usernames }),
  });
}

export async function removeGroupMember(chatId: string, userId: string): Promise<ChatDTO> {
  return fetchWithAuth(`/api/chats/${chatId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function leaveGroup(chatId: string): Promise<void> {
  return fetchWithAuth(`/api/chats/${chatId}/leave`, {
    method: 'POST',
  });
}

export async function getGroupMembers(chatId: string): Promise<MemberDTO[]> {
  return fetchWithAuth(`/api/chats/${chatId}/members`);
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
