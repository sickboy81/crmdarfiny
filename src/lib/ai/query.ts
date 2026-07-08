import type { ChatMessage } from './types'

/**
 * Extract text content from a ChatMessage (handles both string and multimodal array).
 */
function extractText(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('\n')
  }
  return ''
}

/**
 * The text to retrieve knowledge against: the most recent customer
 * (`user`) turn in the conversation context. Falls back to the last
 * message of any role, then empty string. Shared by the draft route and
 * the auto-reply bot so both query the knowledge base the same way.
 */
export function latestUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return extractText(messages[i].content)
  }
  return messages.length > 0 ? extractText(messages[messages.length - 1].content) : ''
}
