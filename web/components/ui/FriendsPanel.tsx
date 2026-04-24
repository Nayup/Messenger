'use client';

import { useState, useEffect } from 'react';
import {
  fetchFriends,
  fetchPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
  createPrivateChat,
  fetchUsers,
  sendFriendRequest,
  FriendshipDTO,
  UserDTO,
} from '@/lib/api';
import { useAuthStore } from '@/lib/stores';
import { fetchChats } from '@/lib/api';
import { subscribeToChats } from '@/lib/websocket';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  X,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Loader2,
  Search,
  Check,
  Clock,
  Users,
  Bell,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Tab = 'friends' | 'requests' | 'find';

export default function FriendsPanel({ onClose }: Props) {
  const { setChats, setCurrentChat } = useAuthStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendshipDTO[]>([]);
  const [requests, setRequests] = useState<FriendshipDTO[]>([]);
  const [allUsers, setAllUsers] = useState<UserDTO[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load friends + requests ngay khi mở panel (cho badge + cả 2 tab)
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [friendsData, requestsData] = await Promise.all([
          fetchFriends(),
          fetchPendingRequests(),
        ]);
        setFriends(friendsData);
        setRequests(requestsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Load data khi chuyển tab
  useEffect(() => {
    loadTabData();
  }, [tab]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (tab === 'friends') {
        const data = await fetchFriends();
        setFriends(data);
      } else if (tab === 'requests') {
        const data = await fetchPendingRequests();
        setRequests(data);
      } else if (tab === 'find') {
        const [users, friendsList, pendingReqs] = await Promise.all([
          fetchUsers(),
          fetchFriends(),
          fetchPendingRequests(),
        ]);
        // Build status map
        const statuses: Record<string, string> = {};
        friendsList.forEach((f) => (statuses[f.user.id] = 'FRIENDS'));
        pendingReqs.forEach((f) => (statuses[f.user.id] = 'RECEIVED'));
        setAllUsers(users);
        setFriendStatuses(statuses);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await acceptFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    } catch (err) {
      console.error('Failed to accept:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await rejectFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfriend = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn hủy kết bạn?')) return;
    setActionLoading(userId);
    try {
      await unfriend(userId);
      setFriends((prev) => prev.filter((f) => f.user.id !== userId));
    } catch (err) {
      console.error('Failed to unfriend:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setActionLoading(userId);
    try {
      await sendFriendRequest(userId);
      setFriendStatuses((prev) => ({ ...prev, [userId]: 'SENT' }));
    } catch (err: any) {
      console.error('Failed to send request:', err);
      // Nếu đã gửi rồi → update UI
      if (err.message?.includes('Đã gửi') || err.message?.includes('Đã là bạn bè')) {
        setFriendStatuses((prev) => ({ ...prev, [userId]: err.message.includes('bạn bè') ? 'FRIENDS' : 'SENT' }));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = async (username: string) => {
    try {
      await createPrivateChat(username);
      const newChats = await fetchChats();
      setChats(newChats);
      subscribeToChats(newChats.map((c) => c.id));
      // Find and select the private chat with this user
      const chat = newChats.find(
        (c) => c.type === 'PRIVATE' && c.otherUser?.username === username
      );
      if (chat) setCurrentChat(chat.id);
      onClose();
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Bạn bè</h2>
              <p className="text-xs text-zinc-500">Quản lý bạn bè</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => { setTab('friends'); setSearchTerm(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === 'friends' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Bạn bè
            </div>
            {tab === 'friends' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => { setTab('requests'); setSearchTerm(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === 'requests' ? 'text-pink-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Bell className="w-4 h-4" />
              Lời mời
              {requests.length > 0 && tab !== 'requests' && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-pink-500 text-white rounded-full font-bold">
                  {requests.length}
                </span>
              )}
            </div>
            {tab === 'requests' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-pink-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => { setTab('find'); setSearchTerm(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === 'find' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              Tìm bạn
            </div>
            {tab === 'find' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder={
                tab === 'friends' ? 'Tìm bạn bè...' :
                tab === 'requests' ? 'Tìm lời mời...' :
                'Tìm người dùng...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : tab === 'friends' ? (
            /* ====== FRIENDS TAB ====== */
            filteredFriends.length === 0 ? (
              <div className="text-center py-16">
                <UserCheck className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">
                  {searchTerm ? 'Không tìm thấy' : 'Chưa có bạn bè nào'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setTab('find')}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Tìm bạn →
                  </button>
                )}
              </div>
            ) : (
              filteredFriends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/40 group transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={f.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${f.user.username}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm">
                      {f.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{f.user.username}</p>
                    <p className="text-[11px] text-zinc-500">{f.user.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleChat(f.user.username)}
                      className="p-2 rounded-lg hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 transition-all"
                      title="Nhắn tin"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUnfriend(f.user.id)}
                      disabled={actionLoading === f.user.id}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                      title="Hủy kết bạn"
                    >
                      {actionLoading === f.user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )
          ) : tab === 'requests' ? (
            /* ====== REQUESTS TAB ====== */
            requests.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Không có lời mời nào</p>
              </div>
            ) : (
              requests
                .filter((r) => r.user.username.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-800/40 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={r.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${r.user.username}`}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-sm">
                        {r.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{r.user.username}</p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAccept(r.id)}
                        disabled={actionLoading === r.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Chấp nhận'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={actionLoading === r.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))
            )
          ) : (
            /* ====== FIND TAB ====== */
            filteredUsers.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">
                  {searchTerm ? 'Không tìm thấy' : 'Không có người dùng nào'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const status = friendStatuses[user.id];
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/40 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{user.username}</p>
                      <p className="text-[11px] text-zinc-500">{user.email}</p>
                    </div>
                    {status === 'FRIENDS' ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-1 rounded-full bg-emerald-500/10">
                        <Check className="w-3 h-3" />
                        Bạn bè
                      </span>
                    ) : status === 'SENT' ? (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400 px-2 py-1 rounded-full bg-zinc-800">
                        <Clock className="w-3 h-3" />
                        Đã gửi
                      </span>
                    ) : status === 'RECEIVED' ? (
                      <span className="flex items-center gap-1 text-[11px] text-pink-400 px-2 py-1 rounded-full bg-pink-500/10">
                        <Bell className="w-3 h-3" />
                        Chờ xác nhận
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            Kết bạn
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
