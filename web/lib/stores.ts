'use client';

import { create } from 'zustand';
import type { ChatDTO } from './api';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  token: string;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isMine: boolean;
}

interface AuthStore {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  initFromStorage: () => void;

  chats: ChatDTO[];
  setChats: (chats: ChatDTO[]) => void;
  updateChatLastMessage: (chatId: string, content: string, time: string) => void;

  currentChatId: string | null;
  setCurrentChat: (id: string) => void;

  // Messages per chat
  messagesMap: Record<string, Message[]>;
  setMessages: (chatId: string, msgs: Message[]) => void;
  addMessage: (chatId: string, msg: Message) => void;
  getMessages: (chatId: string) => Message[];
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,

  login: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('messenger_token', user.token);
      localStorage.setItem('messenger_user', JSON.stringify(user));
    }
    set({ currentUser: user });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('messenger_token');
      localStorage.removeItem('messenger_user');
    }
    set({ currentUser: null, chats: [], currentChatId: null, messagesMap: {} });
  },

  initFromStorage: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('messenger_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          set({ currentUser: user });
        } catch {
          // corrupt data
        }
      }
    }
  },

  chats: [],
  setChats: (chats) => set({ chats }),

  // Cập nhật tin nhắn cuối cùng trong chat list preview
  updateChatLastMessage: (chatId, content, time) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, lastMessage: content, lastMessageTime: time }
          : chat
      ),
    })),

  currentChatId: null,
  setCurrentChat: (id: string) => set({ currentChatId: id }),

  messagesMap: {},
  setMessages: (chatId, msgs) =>
    set((state) => ({
      messagesMap: { ...state.messagesMap, [chatId]: msgs },
    })),
  addMessage: (chatId, msg) =>
    set((state) => ({
      messagesMap: {
        ...state.messagesMap,
        [chatId]: [...(state.messagesMap[chatId] || []), msg],
      },
    })),
  getMessages: (chatId) => get().messagesMap[chatId] || [],
}));