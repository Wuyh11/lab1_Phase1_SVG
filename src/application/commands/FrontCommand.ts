import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class FrontCommand extends Command {
  constructor(private readonly id: string) { super(); }
  execute(document: SvgDocument): string { document.reorder(this.id, true); return `${document.find(this.id).tag}#${this.id} moved to front`; }
}
