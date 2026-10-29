import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Command } from './commands/Command.js';
export class HistoryEntry {
  constructor(private readonly operation: Command, private readonly previous: SvgDocument,
    private readonly following: SvgDocument, private readonly result: string) {}
  before(): SvgDocument { return this.previous.clone(); }
  after(): SvgDocument { return this.following.clone(); }
  get message(): string { return this.result; }
  get commandName(): string { return this.operation.constructor.name; }
}
