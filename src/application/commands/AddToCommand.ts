import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class AddToCommand extends Command {
  constructor(private readonly group: string, private readonly id: string) { super(); }
  execute(document: SvgDocument): string {
    document.addTo(this.group, this.id); return `${document.find(this.id).tag}#${this.id} added to g#${this.group}`;
  }
}
