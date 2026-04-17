'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatList from '@/components/ui/ChatList';
import ChatWindow from '@/components/ui/ChatWindow';
import { useAuthStore } from '@/lib/stores';
import { fetchChats } from '@/lib/api';
import { connectWebSocket, subscribeToChats, subscribeToChat, subscribeToUserTopic, setGlobalMessageHandler, setUserNotificationHandler } from '@/lib/websocket';
import { MessageCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { currentUser, initFromStorage, setChats, currentChatId } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initFromStorage();
  }, []);

  useEffect(() => {
    if (currentUser === null && !loading) {
      router.push('/login');
    }
  }, [currentUser, loading]);

  // Set up global message handler — xử lý tin nhắn từ TẤT CẢ chats
  useEffect(() => {
    setGlobalMessageHandler((msg: any) => {
      const state = useAuthStore.getState();
      const chatId = msg.chat?.id?.toString() || msg.chatId;
      const senderUsername = msg.sender?.username || msg.senderUsername;
      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Cập nhật chat list preview (last message)
      state.updateChatLastMessage(chatId, msg.content, time);

      // Thêm tin nhắn vào danh sách messages (nếu không phải từ mình)
      if (senderUsername !== state.currentUser?.username) {
        state.addMessage(chatId, {
          id: msg.id || Date.now().toString(),
          sender: senderUsername || 'Unknown',
          content: msg.content,
          timestamp: time,
          isMine: false,
        });
      }
    });
  }, []);

  // Handle user notifications — phát hiện chat mới khi có tin nhắn đến
  useEffect(() => {
    setUserNotificationHandler(async (notification: any) => {
      if (notification.type === 'NEW_MESSAGE') {
        const state = useAuthStore.getState();
        const chatId = notification.chatId;
        const senderUsername = notification.senderUsername;

        // Bỏ qua tin nhắn từ chính mình
        if (senderUsername === state.currentUser?.username) return;

        // Kiểm tra xem chat đã có trong danh sách chưa
        const existingChat = state.chats.find((c) => c.id === chatId);

        if (!existingChat) {
          // Chat mới! Fetch lại danh sách chats
          try {
            const newChats = await fetchChats();
            state.setChats(newChats);
            // Subscribe tới chat topic mới
            subscribeToChat(chatId);
          } catch (err) {
            console.error('Failed to refresh chats:', err);
          }
        } else {
          // Chat đã tồn tại — cập nhật last message
          const time = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          state.updateChatLastMessage(chatId, notification.content, time);

          // Thêm tin nhắn vào messages nếu chưa có (từ user topic)
          state.addMessage(chatId, {
            id: Date.now().toString(),
            sender: senderUsername || 'Unknown',
            content: notification.content,
            timestamp: time,
            isMine: false,
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('messenger_user');
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const user = JSON.parse(stored);
        // Load chats
        const chats = await fetchChats();
        setChats(chats);

        // Connect WebSocket VÀ subscribe tới TẤT CẢ chat topics + user topic
        connectWebSocket(() => {
          const chatIds = chats.map((c) => c.id);
          subscribeToChats(chatIds);
          // Subscribe tới personal topic để nhận thông báo chat mới
          subscribeToUserTopic(user.username);
        });
      } catch (err) {
        console.error('Failed to load chats:', err);
        // If loading fails, clear stale auth and go to login
        localStorage.removeItem('messenger_token');
        localStorage.removeItem('messenger_user');
        router.push('/login');
        return;
      }
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <p className="text-zinc-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800/50 flex flex-col bg-zinc-950">
        <ChatList />
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        {currentChatId ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-zinc-950">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 mb-4">
                <MessageCircle className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-300 mb-2">Messenger</h2>
              <p className="text-zinc-500 text-sm max-w-xs">
                Chọn một cuộc trò chuyện bên trái hoặc bắt đầu cuộc trò chuyện mới
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}