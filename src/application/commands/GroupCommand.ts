import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class GroupCommand extends Command {
  constructor(private readonly id: string, private readonly members: readonly string[]) { super(); }
  execute(document: SvgDocument): string {
    document.group(this.id, this.members); return `g#${this.id} created with ${this.members.length} children`;
  }
}
