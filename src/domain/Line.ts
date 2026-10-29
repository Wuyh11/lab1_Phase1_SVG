import { Shape } from './Shape.js';
export class Line extends Shape {
  constructor(id: string) { super(id); this.initializeGeometry(); }
  get tag(): string { return 'line'; }
  protected get geometry(): readonly string[] { return ['x1', 'y1', 'x2', 'y2']; }
  protected get horizontal(): readonly string[] { return ['x1', 'x2']; }
  protected get vertical(): readonly string[] { return ['y1', 'y2']; }
  protected blank(): Line { return new Line(this.id); }
}
