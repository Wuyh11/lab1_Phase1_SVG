import { Shape } from './Shape.js';
export class Rect extends Shape {
  constructor(id: string) { super(id); this.initializeGeometry(); }
  get tag(): string { return 'rect'; }
  protected get geometry(): readonly string[] { return ['x', 'y', 'width', 'height']; }
  protected get horizontal(): readonly string[] { return ['x']; }
  protected get vertical(): readonly string[] { return ['y']; }
  protected blank(): Rect { return new Rect(this.id); }
}
