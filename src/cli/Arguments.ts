import type { Token } from './Tokenizer.js';
export class Arguments {
  constructor(private readonly tokens: readonly Token[], private readonly syntax: string) {}
  count(minimum: number, maximum = minimum): this {
    if (this.tokens.length < minimum || this.tokens.length > maximum) throw new Error(`usage: ${this.syntax}`);
    return this;
  }
  get length(): number { return this.tokens.length; }
  at(index: number): string {
    const value = this.tokens[index]?.value;
    if (value === undefined) throw new Error(`usage: ${this.syntax}`);
    return value;
  }
  optional(index: number): string | undefined { return this.tokens[index]?.value; }
  values(start = 0): readonly string[] { return this.tokens.slice(start).map(token => token.value); }
  createTail(): { params: readonly string[]; parent?: string } {
    const suffix = this.tokens[this.length - 2];
    if (this.length >= 4 && suffix?.value === 'in' && !suffix.quoted) {
      return { params: this.tokens.slice(2, -2).map(token => token.value), parent: this.at(this.length - 1) };
    }
    return { params: this.values(2) };
  }
}
