import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class BackCommand extends Command {
  constructor(private readonly id: string) { super(); }
  execute(document: SvgDocument): string { document.reorder(this.id, false); return `${document.find(this.id).tag}#${this.id} moved to back`; }
}
