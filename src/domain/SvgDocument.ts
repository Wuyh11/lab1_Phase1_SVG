import { Shape } from './Shape.js';
import { Group } from './Group.js';

export class SvgDocument {
  private root = new Group('', true);
  private canvasWidth = 800;
  private canvasHeight = 600;
  constructor(width = 800, height = 600) { this.resize(width, height); }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.root.children; }
  get size(): number { return this.flatten().length; }
  resize(width: number, height: number): void {
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('canvas dimensions must be positive');
    this.canvasWidth = width; this.canvasHeight = height;
  }
  find(id: string): Shape {
    const shape = this.flatten().find(item => item.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  container(id?: string): Group {
    if (id === undefined) return this.root;
    const shape = this.flatten().find(item => item.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }
  parentOf(shape: Shape): Group {
    const parent = [this.root, ...this.flatten().filter(item => item instanceof Group)]
      .find(item => item.children.includes(shape));
    if (!(parent instanceof Group)) throw new Error(`no such shape: ${shape.id}`);
    return parent;
  }
  add(shape: Shape, containerId?: string): void {
    const ids = new Set(this.flatten().map(item => item.id));
    for (const item of this.subtree(shape)) {
      if (ids.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      ids.add(item.id);
    }
    this.container(containerId).insert(shape);
  }
  delete(id: string): void { const shape = this.find(id); this.parentOf(shape).remove(shape); }
  group(id: string, selectedIds: readonly string[]): void {
    if (this.flatten().some(item => item.id === id)) throw new Error(`id already exists: ${id}`);
    if (!selectedIds.length) throw new Error('group requires at least one shape');
    if (new Set(selectedIds).size !== selectedIds.length) throw new Error('duplicate group member');
    const selected = selectedIds.map(item => this.find(item));
    for (const item of selected) {
      if (item instanceof Group && selected.some(other => other !== item && item.contains(other))) {
        throw new Error(`cannot group a container into its own descendant: ${item.id}`);
      }
    }
    // Use document traversal order, independent of argument ordering. New group occupies
    // the earliest selected sibling slot when all selected shapes share a parent.
    const ordered = this.flatten().filter(item => selected.includes(item));
    const parents = ordered.map(item => this.parentOf(item));
    const sameParent = parents.every(parent => parent === parents[0]);
    const target = sameParent ? parents[0]! : this.root;
    const index = sameParent ? target.children.indexOf(ordered[0]!) :
      target.children.findIndex(item => selected.includes(item));
    const group = new Group(id);
    for (const item of ordered) { this.parentOf(item).remove(item); group.insert(item); }
    target.insert(group, index < 0 ? target.children.length : index);
  }
  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parentOf(group);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.remove(group);
    for (const [offset, child] of group.children.entries()) { group.remove(child); parent.insert(child, index + offset); }
  }
  addTo(groupId: string, id: string): void {
    const target = this.container(groupId);
    const shape = this.find(id);
    if (shape === target || (shape instanceof Group && shape.contains(target))) {
      throw new Error(`cannot group a container into its own descendant: ${id}`);
    }
    this.parentOf(shape).remove(shape); target.insert(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.find(id); const parent = this.parentOf(shape);
    parent.remove(shape); parent.insert(shape, front ? parent.children.length : 0);
  }
  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height); copy.root = this.root.clone(); return copy;
  }
  flatten(): readonly Shape[] { return this.root.children.flatMap(item => this.subtree(item)); }
  private subtree(shape: Shape): Shape[] { return [shape, ...shape.children.flatMap(child => this.subtree(child))]; }
}
