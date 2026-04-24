'use client';

import { useState, useEffect } from 'react';
import {
  fetchUsers,
  renameGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  getGroupMembers,
  MemberDTO,
  UserDTO,
  ChatDTO,
} from '@/lib/api';
import { useAuthStore } from '@/lib/stores';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  X,
  Users,
  Pencil,
  UserPlus,
  UserMinus,
  LogOut,
  Check,
  Loader2,
  Shield,
  Search,
  ChevronLeft,
} from 'lucide-react';

interface Props {
  chat: ChatDTO;
  onClose: () => void;
  onUpdated: () => void;
}

export default function GroupInfoPanel({ chat, onClose, onUpdated }: Props) {
  const { currentUser } = useAuthStore();
  const [members, setMembers] = useState<MemberDTO[]>(chat.members || []);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(chat.name || '');
  const [renaming, setRenaming] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserDTO[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [addingUsers, setAddingUsers] = useState<string[]>([]);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [removingUser, setRemovingUser] = useState<string | null>(null);

  const currentMember = members.find(
    (m) => m.username === currentUser?.username
  );
  const isAdmin = currentMember?.role === 'ADMIN';

  useEffect(() => {
    loadMembers();
  }, [chat.id]);

  const loadMembers = async () => {
    try {
      const data = await getGroupMembers(chat.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === chat.name) {
      setEditingName(false);
      return;
    }
    setRenaming(true);
    try {
      await renameGroup(chat.id, newName.trim());
      setEditingName(false);
      onUpdated();
    } catch (err) {
      console.error('Failed to rename:', err);
    } finally {
      setRenaming(false);
    }
  };

  const handleShowAddMembers = async () => {
    setShowAddMembers(true);
    setLoading(true);
    try {
      const users = await fetchUsers();
      // Lọc bỏ những người đã là thành viên
      const memberIds = new Set(members.map((m) => m.id));
      setAllUsers(users.filter((u) => !memberIds.has(u.id)));
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (username: string) => {
    setAddingUsers((prev) => [...prev, username]);
    try {
      await addGroupMembers(chat.id, [username]);
      // Remove from available list
      setAllUsers((prev) => prev.filter((u) => u.username !== username));
      await loadMembers();
      onUpdated();
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setAddingUsers((prev) => prev.filter((u) => u !== username));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) return;
    setRemovingUser(userId);
    try {
      await removeGroupMember(chat.id, userId);
      await loadMembers();
      onUpdated();
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingUser(null);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Bạn có chắc muốn rời nhóm này?')) return;
    setLeavingGroup(true);
    try {
      await leaveGroup(chat.id);
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setLeavingGroup(false);
    }
  };

  const filteredAddUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(addSearch.toLowerCase())
  );

  if (showAddMembers) {
    return (
      <div className="w-80 border-l border-zinc-800/50 flex flex-col bg-zinc-900/95 h-full">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/50 flex items-center gap-3">
          <button
            onClick={() => setShowAddMembers(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-semibold text-sm text-zinc-200">
              Thêm thành viên
            </h3>
            <p className="text-[11px] text-zinc-500">
              {allUsers.length} người có thể thêm
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm người dùng..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              autoFocus
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : filteredAddUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">Không tìm thấy</p>
            </div>
          ) : (
            filteredAddUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAddMember(user.username)}
                disabled={addingUsers.includes(user.username)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition-all disabled:opacity-50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
                    }
                  />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm text-zinc-200">{user.username}</p>
                </div>
                {addingUsers.includes(user.username) ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-zinc-800/50 flex flex-col bg-zinc-900/95 h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-zinc-200">Thông tin nhóm</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Group info */}
      <div className="p-5 flex flex-col items-center border-b border-zinc-800/50">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
          <Users className="w-8 h-8 text-white" />
        </div>

        {editingName ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              maxLength={100}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button
              onClick={handleRename}
              disabled={renaming}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              {renaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNewName(chat.name || '');
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-zinc-200">
              {chat.name}
            </h4>
            <button
              onClick={() => setEditingName(true)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Đổi tên nhóm"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <p className="text-xs text-zinc-500 mt-1">
          {members.length} thành viên
        </p>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Thành viên
          </p>
          <button
            onClick={handleShowAddMembers}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Thêm
          </button>
        </div>

        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/40 group transition-colors"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={
                  member.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${member.username}`
                }
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs">
                {member.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-zinc-200 truncate">
                  {member.username}
                  {member.username === currentUser?.username && (
                    <span className="text-zinc-500"> (Bạn)</span>
                  )}
                </p>
              </div>
              {member.role === 'ADMIN' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-amber-400">Quản trị viên</span>
                </div>
              )}
            </div>

            {/* Remove button — only admin can remove others */}
            {isAdmin &&
              member.username !== currentUser?.username && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removingUser === member.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                  title="Xóa khỏi nhóm"
                >
                  {removingUser === member.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserMinus className="w-4 h-4" />
                  )}
                </button>
              )}
          </div>
        ))}
      </div>

      {/* Leave group button */}
      <div className="p-4 border-t border-zinc-800/50">
        <button
          onClick={handleLeave}
          disabled={leavingGroup}
          className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium flex items-center justify-center gap-2 transition-all"
        >
          {leavingGroup ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Rời nhóm
            </>
          )}
        </button>
      </div>
    </div>
  );
}
