'use client';

import { useState, useEffect } from 'react';
import { fetchUsers, createPrivateChat, UserDTO } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, MessageCircle, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onChatCreated: () => void;
}

export default function NewChatDialog({ onClose, onChatCreated }: Props) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateChat = async (user: UserDTO) => {
    setCreating(user.id);
    try {
      await createPrivateChat(user.username);
      onChatCreated();
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Trò chuyện mới</h2>
              <p className="text-xs text-zinc-500">Chọn người để bắt đầu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              id="new-chat-search"
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all"
            />
          </div>
        </div>

        {/* User list */}
        <div className="max-h-80 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">
                {searchTerm ? 'Không tìm thấy người dùng' : 'Không có người dùng nào khác'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleCreateChat(user)}
                disabled={creating !== null}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800/60 transition-all duration-150 disabled:opacity-50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
                    }
                  />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-zinc-200">{user.username}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
                {creating === user.id ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-zinc-600" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
