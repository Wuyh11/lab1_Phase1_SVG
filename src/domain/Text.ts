import { Shape } from './Shape.js';
export class Text extends Shape {
  private content = '';
  constructor(id: string) { super(id); this.initializeGeometry(); }
  get tag(): string { return 'text'; }
  protected get geometry(): readonly string[] { return ['x', 'y']; }
  protected get horizontal(): readonly string[] { return ['x']; }
  protected get vertical(): readonly string[] { return ['y']; }
  protected blank(): Text { return new Text(this.id); }
  override set(key: string, value: string): void {
    if (key === 'text') { this.validateText(value); this.content = value; }
    else super.set(key, value);
  }
  override get textContent(): string { return this.content; }
  override clone(): Text {
    const copy = super.clone() as Text;
    copy.content = this.content;
    return copy;
  }
}
