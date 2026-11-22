/**
 * Hangul syllable decomposition (Unicode algorithm) for jamo prompts.
 * A syllable U+AC00..U+D7A3 = 0xAC00 + ((initial * 21) + medial) * 28 + final.
 */

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]
const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ',
  'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
]
const JONGSEONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ',
  'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ',
  'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

/** Split one Hangul syllable into its jamo letters. Non-Hangul chars pass through. */
export function decomposeSyllable(ch: string): string[] {
  const code = ch.codePointAt(0)
  if (code === undefined || code < 0xac00 || code > 0xd7a3) return [ch]
  const s = code - 0xac00
  const cho = Math.floor(s / (21 * 28))
  const jung = Math.floor((s % (21 * 28)) / 28)
  const jong = s % 28
  const out = [CHOSEONG[cho] ?? '', JUNGSEONG[jung] ?? '']
  const tail = JONGSEONG[jong]
  if (tail) out.push(tail)
  return out
}

/**
 * Letter-by-letter jamo prompt for a whole word, e.g. "하다" -> "ㅎ ㅏ ㄷ ㅏ".
 * Syllables are separated with a wider gap marker (" · ").
 */
export function jamoPrompt(word: string): string {
  return [...word]
    .map((ch) => decomposeSyllable(ch).join(' '))
    .join('  ·  ')
}
