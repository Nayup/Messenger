'use client';

import { Message } from '@/lib/stores';

export default function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${message.isMine ? 'chat-bubble-right' : 'chat-bubble-left'}`}>
        <p className="text-sm">{message.content}</p>
        <p className="text-[10px] text-right mt-1 opacity-70">{message.timestamp}</p>
      </div>
    </div>
  );
}