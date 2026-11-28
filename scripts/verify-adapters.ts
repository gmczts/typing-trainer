/**
 * Headless verification of the adapters + engine logic (no browser needed).
 * Bundled with esbuild, run with node. Exits non-zero on any failure.
 */
import { cantoneseAdapter } from  '../src/languages/cantonese/adapter'
import { koreanAdapter } from  '../src/languages/korean/adapter'
import { spanishAdapter } from  '../src/languages/spanish/adapter'
import { normalizeSpanish } from  '../src/languages/spanish/adapter'
import { japaneseAdapter } from  '../src/languages/japanese/adapter'
import { chineseAdapter } from  '../src/languages/chinese/adapter'
import { LANGUAGE_META, META_BY_ID } from  '../src/languages/meta'
import { jamoPrompt, decomposeSyllable } from  '../src/core/hangul'
import { levelCountFor } from  '../src/core/types'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  PASS ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name} ${detail}`)
  }
}

console.log('== counts ==')
check('cantonese 6000 words', cantoneseAdapter.words.length === 6000, `got ${cantoneseAdapter.words.length}`)
check('cantonese 600 levels', levelCountFor(cantoneseAdapter.words.length) === 600)
check('korean 6000 words', koreanAdapter.words.length === 6000, `got ${koreanAdapter.words.length}`)
check('korean 600 levels', levelCountFor(koreanAdapter.words.length) === 600)
check('spanish 6000 words', spanishAdapter.words.length === 6000, `got ${spanishAdapter.words.length}`)
check('spanish 600 levels', levelCountFor(spanishAdapter.words.length) === 600)
check('spanish not stub', spanishAdapter.isStub === false)
check('cantonese not stub', cantoneseAdapter.isStub === false)
check('korean not stub', koreanAdapter.isStub === false)
check('japanese 544 items', japaneseAdapter.words.length === 544, `got ${japaneseAdapter.words.length}`)
check('japanese 55 levels', levelCountFor(japaneseAdapter.words.length) === 55)
check('japanese not stub', japaneseAdapter.isStub === false)
check('chinese 6000 words', chineseAdapter.words.length === 6000, `got ${chineseAdapter.words.length}`)
check('chinese 600 levels', levelCountFor(chineseAdapter.words.length) === 600)
check('chinese not stub', chineseAdapter.isStub === false)

console.log('== meta consistency (home screen renders from meta, not the adapters) ==')
const adaptersById = {
  cantonese: cantoneseAdapter,
  korean: koreanAdapter,
  spanish: spanishAdapter,
  japanese: japaneseAdapter,
  chinese: chineseAdapter,
}
check('meta has 5 languages', LANGUAGE_META.length === 5)
for (const meta of LANGUAGE_META) {
  const a = adaptersById[meta.id]
  check(`${meta.id} meta name`, meta.name === a.name, `meta "${meta.name}" vs adapter "${a.name}"`)
  check(`${meta.id} meta englishName`, meta.englishName === a.englishName, `meta "${meta.englishName}" vs adapter "${a.englishName}"`)
  check(`${meta.id} meta color`, meta.color === a.color, `meta "${meta.color}" vs adapter "${a.color}"`)
  check(`${meta.id} meta isStub`, meta.isStub === a.isStub)
  check(`${meta.id} meta wordCount`, meta.wordCount === a.words.length, `meta ${meta.wordCount} vs adapter ${a.words.length}`)
  check(`${meta.id} META_BY_ID matches`, META_BY_ID[meta.id] === meta)
}

console.log('== cantonese matching ==')
const wo = cantoneseAdapter.words[0] // 我 ngo5 vo
check('first word is 我', wo.display === '我' && wo.answer === 'vo', JSON.stringify(wo))
check('vo matches', cantoneseAdapter.matches('vo', wo))
check('VO matches (case-insensitive)', cantoneseAdapter.matches('VO', wo))
check('vf does not match', !cantoneseAdapter.matches('vf', wo))
check('empty does not match', !cantoneseAdapter.matches('', wo))
check('hint is the sg code', wo.hint === 'vo')
check('jyutping above', wo.above[0]?.text === 'ngo5' && wo.above[0]?.tone === 'jyutping')
check('pinyin below', wo.below[0]?.text === 'wǒ' && wo.below[0]?.tone === 'pinyin')
check('level/position', wo.level === 1 && wo.positionInLevel === 1)
check('word 6000 is level 600 pos 10', cantoneseAdapter.words[5999].level === 600 && cantoneseAdapter.words[5999].positionInLevel === 10)
check('keymap groups present', cantoneseAdapter.keymapGroups.length === 6)
check('26 key cards', cantoneseAdapter.keyCards.length === 26)

console.log('== korean matching + jamo ==')
const hada = koreanAdapter.words[1] // 하다 hada
check('second word is 하다', hada.display === '하다' && hada.answer === '하다')
check('하다 matches', koreanAdapter.matches('하다', hada))
check('하디 does not match', !koreanAdapter.matches('하디', hada))
check('romanization above', hada.above[0]?.text === 'hada' && hada.above[0]?.tone === 'roman')
check('chinese gloss first', hada.below[0]?.text === '做、进行' && hada.below[0]?.tone === 'gloss')
check('jamo prompt 하다', hada.prompt === 'ㅎ ㅏ  ·  ㄷ ㅏ' || jamoPrompt('하다') === 'ㅎ ㅏ  ·  ㄷ ㅏ', `got "${jamoPrompt('하다')}"`)
check('decompose 것', decomposeSyllable('것').join('') === 'ㄱㅓㅅ', decomposeSyllable('것').join(''))
check('26 key cards', koreanAdapter.keyCards.length === 26)
check('keymap has consonants+vowels', koreanAdapter.keymapGroups.length === 3)

console.log('== spanish accent-insensitive matching ==')
const arbol = spanishAdapter.words.find((w) => w.display === 'árbol')
const cancion = spanishAdapter.words.find((w) => w.display === 'canción')
const lapiz = spanishAdapter.words.find((w) => w.display === 'lápiz')
check('árbol in list', !!arbol)
if (arbol) {
  check('arbol matches árbol', spanishAdapter.matches('arbol', arbol))
  check('árbol matches árbol', spanishAdapter.matches('árbol', arbol))
  check('ARBOL matches árbol', spanishAdapter.matches('ARBOL', arbol))
  check('arbo does not match', !spanishAdapter.matches('arbo', arbol))
  check('display keeps accent', arbol.display === 'árbol')
}
if (cancion) check('cancion matches canción', spanishAdapter.matches('cancion', cancion))
if (lapiz) check('lapiz matches lápiz', spanishAdapter.matches('lapiz', lapiz))
check('normalize mañana -> manana', normalizeSpanish('mañana') === 'manana')
check('normalize ü -> u', normalizeSpanish('pingüino') === 'pinguino')
const firstEs = spanishAdapter.words[0]
check('first word de', firstEs.display === 'de' && firstEs.answer === 'de')
check('de matches', spanishAdapter.matches('de', firstEs))
check('accent guide present', (spanishAdapter.accentGuide?.length ?? 0) === 6)

console.log('== search ==')
const found = cantoneseAdapter.words.filter((w) => w.searchText.includes('vo'))
check('search "vo" finds 我', found.some((w) => w.display === '我'))
const foundKo = koreanAdapter.words.filter((w) => w.searchText.includes('hada'))
check('search "hada" finds 하다', foundKo.some((w) => w.display === '하다'))
const foundEs = spanishAdapter.words.filter((w) => w.searchText.includes('arbol'))
check('search "arbol" finds árbol', foundEs.some((w) => w.display === 'árbol'))

console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECKS FAILED`)
process.exit(failures === 0 ? 0 : 1)
