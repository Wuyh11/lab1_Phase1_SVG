export type Token = { readonly value: string; readonly quoted: boolean };
export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    const result: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) { index++; continue; }
      let value = ''; let quoted = false;
      if (line[index] === '"') {
        quoted = true; index++; let closed = false;
        while (index < line.length) {
          const char = line[index++]!;
          if (char === '"') { closed = true; break; }
          if (char === '\\' && ['"', '\\'].includes(line[index] ?? '')) value += line[index++]!;
          else value += char;
        }
        if (!closed) throw new Error('unterminated double quote');
        if (index < line.length && !/\s/.test(line[index]!)) throw new Error('expected whitespace after quoted argument');
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"') throw new Error('double quote must begin an argument');
          value += line[index++]!;
        }
      }
      result.push({ value, quoted });
    }
    return result;
  }
}
