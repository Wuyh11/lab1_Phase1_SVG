import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';

export class ShapeFactory {
  // TODO: register ShapeProviders when plugin support is added.
  private readonly types = new Map<string, { build: (id: string) => Shape; required: readonly string[]; optional?: string }>([
    ['rect', { build: id => new Rect(id), required: ['x', 'y', 'width', 'height'], optional: 'fill' }],
    ['circle', { build: id => new Circle(id), required: ['cx', 'cy', 'r'], optional: 'fill' }],
    ['ellipse', { build: id => new Ellipse(id), required: ['cx', 'cy', 'rx', 'ry'], optional: 'fill' }],
    ['line', { build: id => new Line(id), required: ['x1', 'y1', 'x2', 'y2'], optional: 'stroke' }],
    ['text', { build: id => new Text(id), required: ['x', 'y', 'text'] }],
    ['g', { build: id => new Group(id), required: [] }],
  ]);

  empty(type: string, id: string): Shape { return this.definition(type).build(id); }
  create(type: string, id: string, params: readonly string[]): Shape {
    const definition = this.definition(type);
    const minimum = definition.required.length;
    if (params.length < minimum || params.length > minimum + Number(Boolean(definition.optional))) {
      throw new Error(`usage: create ${type} <id> ${definition.required.map(key => `<${key}>`).join(' ')}${definition.optional ? ` [${definition.optional}]` : ''} [in <containerId>]`);
    }
    const shape = definition.build(id);
    definition.required.forEach((key, index) => shape.set(key, params[index]!));
    if (definition.optional && params[minimum] !== undefined) shape.set(definition.optional, params[minimum]!);
    return shape;
  }
  private definition(type: string) {
    const definition = this.types.get(type);
    if (!definition) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
