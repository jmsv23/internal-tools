const MAX_CHUNK_SIZE = 600;

/**
 * Split text into chunks suitable for TTS API (max 600 chars per request)
 * Preserves sentence boundaries where possible
 */
export function chunkTextForTTS(text: string): string[] {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // Handle sentences longer than max chunk size
    if (trimmedSentence.length > MAX_CHUNK_SIZE) {
      // First, push any accumulated content
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      // Split long sentence by words
      const wordChunks = splitLongSentenceByWords(trimmedSentence);
      chunks.push(...wordChunks);
      continue;
    }

    // Check if adding this sentence would exceed limit
    const potentialChunk = currentChunk
      ? `${currentChunk} ${trimmedSentence}`
      : trimmedSentence;

    if (potentialChunk.length <= MAX_CHUNK_SIZE) {
      currentChunk = potentialChunk;
    } else {
      // Push current chunk and start new one
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedSentence;
    }
  }

  // Push remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split text into sentences, preserving punctuation
 */
function splitIntoSentences(text: string): string[] {
  // Match sentences ending with . ! ? followed by space or end of string
  // Also handles quotes and special punctuation
  const sentenceRegex = /[^.!?]*[.!?]+["']?\s*/g;
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0]);
    lastIndex = sentenceRegex.lastIndex;
  }

  // Handle any remaining text without ending punctuation
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
  }

  return sentences;
}

/**
 * Split a long sentence by words when it exceeds max chunk size
 */
function splitLongSentenceByWords(sentence: string): string[] {
  const words = sentence.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    // Handle extremely long words (unlikely but safe)
    if (word.length > MAX_CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      // Split by character as last resort
      for (let i = 0; i < word.length; i += MAX_CHUNK_SIZE) {
        chunks.push(word.slice(i, i + MAX_CHUNK_SIZE));
      }
      continue;
    }

    const potentialChunk = currentChunk ? `${currentChunk} ${word}` : word;

    if (potentialChunk.length <= MAX_CHUNK_SIZE) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
