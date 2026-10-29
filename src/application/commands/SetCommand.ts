import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class SetCommand extends Command {
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }
  execute(document: SvgDocument): string {
    const shape = document.find(this.id); shape.set(this.attribute, this.value);
    return `${shape.tag}#${shape.id} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
