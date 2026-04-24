'use client';

import { Message } from '@/lib/stores';
import { Info } from 'lucide-react';

export default function MessageBubble({ message }: { message: Message }) {
  // System messages — hiển thị giữa màn hình với style khác biệt
  if (message.messageType === 'SYSTEM') {
    return (
      <div className="flex justify-center py-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/30">
          <Info className="w-3 h-3 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${message.isMine ? 'chat-bubble-right' : 'chat-bubble-left'}`}>
        {/* Hiện tên người gửi cho tin nhắn group (không phải của mình) */}
        {!message.isMine && message.sender && (
          <p className="text-[10px] text-blue-400 font-medium mb-0.5">{message.sender}</p>
        )}
        <p className="text-sm">{message.content}</p>
        <p className="text-[10px] text-right mt-1 opacity-70">{message.timestamp}</p>
      </div>
    </div>
  );
}