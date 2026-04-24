'use client';

import { useState, useEffect } from 'react';
import { fetchUsers, createGroupChat, UserDTO } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, Users, Loader2, Check, ArrowRight } from 'lucide-react';

interface Props {
  onClose: () => void;
  onGroupCreated: () => void;
}

export default function NewGroupDialog({ onClose, onGroupCreated }: Props) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserDTO[]>([]);
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [groupName, setGroupName] = useState('');

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

  const toggleUser = (user: UserDTO) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const isSelected = (userId: string) =>
    selectedUsers.some((u) => u.id === userId);

  const handleNext = () => {
    if (selectedUsers.length < 2) return;
    // Auto-generate tên nhóm từ tên thành viên
    const names = selectedUsers.map((u) => u.username).join(', ');
    setGroupName(names.length > 30 ? names.substring(0, 30) + '...' : names);
    setStep('name');
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    setCreating(true);
    try {
      await createGroupChat(
        groupName.trim(),
        selectedUsers.map((u) => u.username)
      );
      onGroupCreated();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {step === 'select' ? 'Tạo nhóm mới' : 'Đặt tên nhóm'}
              </h2>
              <p className="text-xs text-zinc-500">
                {step === 'select'
                  ? `Đã chọn ${selectedUsers.length} người`
                  : `${selectedUsers.length} thành viên`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'select' ? (
          <>
            {/* Selected users preview */}
            {selectedUsers.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/20 rounded-full px-2.5 py-1 cursor-pointer hover:bg-blue-500/25 transition-colors"
                    onClick={() => toggleUser(user)}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage
                        src={
                          user.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
                        }
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-[8px]">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-blue-300">{user.username}</span>
                    <X className="w-3 h-3 text-blue-400" />
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="group-search"
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                />
              </div>
            </div>

            {/* User list */}
            <div className="max-h-64 overflow-y-auto px-2 pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-sm">
                    {searchTerm
                      ? 'Không tìm thấy người dùng'
                      : 'Không có người dùng nào khác'}
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                      isSelected(user.id)
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'hover:bg-zinc-800/60 border border-transparent'
                    }`}
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
                      <p className="text-sm font-medium text-zinc-200">
                        {user.username}
                      </p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected(user.id)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600'
                      }`}
                    >
                      {isSelected(user.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Next button */}
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={handleNext}
                disabled={selectedUsers.length < 2}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
              >
                Tiếp tục
                <ArrowRight className="w-4 h-4" />
              </button>
              {selectedUsers.length < 2 && (
                <p className="text-center text-xs text-zinc-500 mt-2">
                  Chọn ít nhất 2 người để tạo nhóm
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Name input step */}
            <div className="p-6">
              {/* Group avatar preview */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700">
                    <span className="text-xs text-zinc-300 font-bold">
                      {selectedUsers.length + 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group name input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tên nhóm
                </label>
                <input
                  id="group-name-input"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  autoFocus
                  maxLength={100}
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* Members preview */}
              <div className="mb-5">
                <p className="text-xs text-zinc-500 mb-2">
                  Thành viên ({selectedUsers.length + 1} người, bao gồm bạn)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full"
                    >
                      {u.username}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !groupName.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Tạo nhóm'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
