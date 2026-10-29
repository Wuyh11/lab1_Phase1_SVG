import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class MoveCommand extends Command {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  execute(document: SvgDocument): string {
    const shape = document.find(this.id); shape.move(this.dx, this.dy);
    return `${shape.tag}#${shape.id} moved by (${this.dx},${this.dy})`;
  }
}
