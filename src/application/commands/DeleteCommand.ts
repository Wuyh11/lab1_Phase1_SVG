import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class DeleteCommand extends Command {
  constructor(private readonly id: string) { super(); }
  execute(document: SvgDocument): string {
    const tag = document.find(this.id).tag; document.delete(this.id); return `${tag}#${this.id} deleted`;
  }
}
