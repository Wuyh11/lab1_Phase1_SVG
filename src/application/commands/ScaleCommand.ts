import { Command } from './Command.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class ScaleCommand extends Command {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  execute(document: SvgDocument): string {
    const shape = document.find(this.id); shape.scale(this.factor); return `${shape.tag}#${shape.id} scaled by ${this.factor}`;
  }
}
