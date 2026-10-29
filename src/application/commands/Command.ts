import type { SvgDocument } from '../../domain/SvgDocument.js';
export abstract class Command {
  abstract execute(document: SvgDocument): string;
}
