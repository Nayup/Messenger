'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore, Message } from '@/lib/stores';
import { sendMessage } from '@/lib/websocket';
import { fetchMessages, fetchChats } from '@/lib/api';
import MessageBubble from './MessageBubble';
import GroupInfoPanel from './GroupInfoPanel';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Phone, Video, Info, Users } from 'lucide-react';
import { subscribeToChats } from '@/lib/websocket';

export default function ChatWindow() {
  const { currentChatId, messagesMap, addMessage, setMessages, currentUser, chats, setChats, updateChatLastMessage, setCurrentChat } =
    useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Tìm thông tin chat hiện tại
  const currentChat = chats.find((c) => c.id === currentChatId);
  const messages = currentChatId ? messagesMap[currentChatId] || [] : [];
  const isGroup = currentChat?.type === 'GROUP';

  // Load messages khi chọn chat
  useEffect(() => {
    if (!currentChatId) return;
    setShowGroupInfo(false); // Close info panel when switching chats

    const loadMessages = async () => {
      try {
        const data = await fetchMessages(currentChatId);
        const msgs: Message[] = data.map((m) => ({
          id: m.id,
          sender: m.sender?.username || 'Unknown',
          content: m.content,
          timestamp: m.sentAt
            ? new Date(m.sentAt + 'Z').toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh',
              })
            : '',
          isMine: m.sender?.username === currentUser?.username,
          messageType: m.messageType,
        }));
        setMessages(currentChatId, msgs);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();
  }, [currentChatId]);

  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputRef.current?.value.trim() || !currentChatId) return;

    const content = inputRef.current.value;
    sendMessage(currentChatId, content);

    const time = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    // Thêm tin nhắn của mình ngay lập tức (optimistic update)
    addMessage(currentChatId, {
      id: Date.now().toString(),
      sender: currentUser?.username || '',
      content,
      timestamp: time,
      isMine: true,
    });

    // Cập nhật chat list preview
    updateChatLastMessage(currentChatId, content, time);

    inputRef.current.value = '';
    inputRef.current.focus();
  };

  const handleGroupUpdated = async () => {
    // Reload chat list để cập nhật thay đổi
    try {
      const newChats = await fetchChats();
      setChats(newChats);
      subscribeToChats(newChats.map((c) => c.id));

      // Nếu chat hiện tại không còn trong danh sách (đã rời nhóm)
      if (currentChatId && !newChats.find((c) => c.id === currentChatId)) {
        setCurrentChat('');
        setShowGroupInfo(false);
      }
    } catch (err) {
      console.error('Failed to reload chats:', err);
    }
  };

  const chatName = currentChat?.name || currentChat?.otherUser?.username || 'Chat';

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header chat */}
        <div className="h-16 border-b border-zinc-800/50 px-5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {isGroup ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={
                    currentChat?.otherUser?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${chatName}`
                  }
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm">
                  {chatName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="font-semibold text-sm text-zinc-200">{chatName}</p>
              {isGroup ? (
                <p className="text-[11px] text-zinc-500">
                  {currentChat?.memberCount} thành viên
                </p>
              ) : (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Đang hoạt động
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-blue-400 transition-all">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-blue-400 transition-all">
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              className={`p-2.5 rounded-xl transition-all ${
                showGroupInfo
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'hover:bg-zinc-800/80 text-zinc-400 hover:text-blue-400'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/30 flex items-center justify-center mb-3">
                <Send className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">
                Bắt đầu cuộc trò chuyện với{' '}
                <span className="text-blue-400 font-medium">{chatName}</span>
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Nhập tin nhắn..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-zinc-800/80 border-zinc-700/50 focus-visible:ring-blue-500/30 rounded-xl"
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Group Info Panel */}
      {showGroupInfo && isGroup && currentChat && (
        <GroupInfoPanel
          chat={currentChat}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={handleGroupUpdated}
        />
      )}
    </div>
  );
}