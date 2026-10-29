import { Shape } from '../domain/Shape.js';
export class InputNumber {
  static parse(value: string): number { return Shape.number(value); }
}
