'use client'

import { Bot, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../types'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot'

  return (
    <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot ? 'bg-[#0080A3]/10' : 'bg-gray-100'
        }`}
      >
        {isBot ? (
          <Bot className="h-4 w-4 text-[#0080A3]" />
        ) : (
          <User className="h-4 w-4 text-gray-500" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isBot
            ? 'bg-white border border-gray-200 text-gray-800'
            : 'bg-[#0080A3] text-white'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
