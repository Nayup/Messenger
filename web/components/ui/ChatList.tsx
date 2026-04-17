'use client';
import { disconnectWebSocket, subscribeToChats, subscribeToUserTopic, setUserNotificationHandler } from '@/lib/websocket';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, Plus, LogOut } from 'lucide-react';
import { fetchChats } from '@/lib/api';
import { useRouter } from 'next/navigation';
import NewChatDialog from './NewChatDialog';
export default function ChatList() {
  const router = useRouter();
  const { chats, setCurrentChat, currentChatId, currentUser, logout, setChats } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
  if (!currentUser) return;

  // Subscribe tất cả chat hiện tại
  subscribeToChats(chats.map((c) => c.id));

  // Subscribe personal topic
  subscribeToUserTopic(currentUser.username);

  // Khi nhận notification → reload chat list
  setUserNotificationHandler(async () => {
    try {
      const newChats = await fetchChats();
      setChats(newChats);
      subscribeToChats(newChats.map((c) => c.id));
    } catch (err) {
      console.error('Failed to reload chats:', err);
    }
  });
  }, [currentUser?.username]);

  const filteredChats = chats.filter((chat) =>
    (chat.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    disconnectWebSocket();
    logout();
    router.push('/login');
  };

  const handleChatCreated = async () => {
    setShowNewChat(false);
    // Reload danh sách chats
    try {
      const newChats = await fetchChats();
      setChats(newChats);
      // Subscribe tới các chat mới
      subscribeToChats(newChats.map((c) => c.id));
      // Auto select chat mới nhất
      if (newChats.length > 0) {
        setCurrentChat(newChats[newChats.length - 1].id);
      }
    } catch (err) {
      console.error('Failed to reload chats:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-blue-500/30">
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs">
              {currentUser?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Messenger
            </h1>
            <p className="text-[11px] text-zinc-500">{currentUser?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            id="new-chat-btn"
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-blue-400 transition-all duration-200"
            title="Cuộc trò chuyện mới"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-red-400 transition-all duration-200"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            id="chat-search"
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all duration-200"
          />
        </div>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">
              {searchTerm ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Bắt đầu trò chuyện mới →
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChat(chat.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
                currentChatId === chat.id
                  ? 'bg-blue-500/10 border-l-blue-500'
                  : 'hover:bg-zinc-900/60 border-l-transparent'
              }`}
            >
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarImage
                  src={
                    chat.otherUser?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`
                  }
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm">
                  {(chat.name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-sm text-zinc-200 truncate">
                    {chat.name || 'Chat'}
                  </p>
                  {chat.lastMessageTime && (
                    <p className="text-[11px] text-zinc-500 ml-2 flex-shrink-0">
                      {chat.lastMessageTime}
                    </p>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {chat.lastMessage || 'Chưa có tin nhắn'}
                </p>
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      {/* New Chat Dialog */}
      {showNewChat && (
        <NewChatDialog
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}