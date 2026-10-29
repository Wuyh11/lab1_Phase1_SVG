import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class UngroupCommand extends Command {
  constructor(private readonly id: string) { super(); }
  execute(document: SvgDocument): string { document.ungroup(this.id); return `g#${this.id} ungrouped`; }
}
