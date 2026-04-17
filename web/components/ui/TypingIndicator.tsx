'use client';

export default function TypingIndicator() {
  return (
    <div className="flex gap-1 pl-4">
      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
      <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
    </div>
  );
}