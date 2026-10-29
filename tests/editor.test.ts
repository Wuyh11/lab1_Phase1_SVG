import test from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

class Harness {
  readonly store = new MemoryDocumentStore();
  readonly editor = new Editor(this.store);
  readonly cli = new CommandDispatcher(this.editor);
  async run(...lines: string[]): Promise<string> {
    let result = '';
    for (const line of lines) result = (await this.cli.dispatch(line)) ?? '';
    return result;
  }
  async ok(...lines: string[]): Promise<string> {
    let result = '';
    for (const line of lines) {
      result = await this.run(line);
      assert.ok(!result.startsWith('error:'), `${line}: ${result}`);
    }
    return result;
  }
}

test('no-document guard, help and blank/comment handling', async () => {
  const h = new Harness();
  for (const command of ['save x.svg', 'canvas', 'tree', 'show x', 'create g x', 'undo', 'redo']) {
    assert.equal(await h.run(command), "error: no document. use 'init' or 'read' first");
  }
  assert.match(await h.run('help'), /addto <gid> <id>/);
  assert.equal(await h.cli.dispatch('  # ignore me'), undefined);
  assert.equal(await h.cli.dispatch('  '), undefined);
});

test('all six builtins, default appearance and id case sensitivity', async () => {
  const h = new Harness();
  await h.ok('init', 'create rect R 1.5 -2 30 40', 'create circle r 10 20 3 red',
    'create ellipse e 1 2 3 4', 'create line l 1 2 3 4 black', 'create text t 2 3 "你好 world"', 'create g scene');
  assert.match(await h.run('tree'), /svg \(800x600\)/);
  assert.match(await h.run('show R'), /x=1.5 y=-2 width=30 height=40/);
  assert.doesNotMatch(await h.run('show R'), /fill=/);
  assert.doesNotMatch(await h.run('show e'), /stroke=/);
  assert.match(await h.run('show t'), /你好 world/);
  assert.equal(await h.run('create box box1 0 0 1 1 "x"'), 'error: unknown shape type: box (is the plugin loaded?)');
  assert.equal(await h.run('create rect R 0 0 1 1'), 'error: id already exists: R');
});

test('all create forms accept in, parent errors are precise and atomic', async () => {
  const h = new Harness();
  await h.ok('init', 'create g scene', 'create g inner in scene', 'create rect r 0 0 10 10 in inner',
    'create circle c 1 2 3 in inner', 'create ellipse e 1 2 3 4 in inner',
    'create line l 1 2 3 4 in inner', 'create text t 1 2 "in" in inner');
  assert.match(await h.run('show t'), /parent=g#inner/);
  const before = await h.run('tree');
  assert.equal(await h.run('create g fail in missing'), 'error: no such container: missing');
  assert.equal(await h.run('create g fail in r'), 'error: not a container: r');
  assert.equal(await h.run('tree'), before);
});

test('text quotes, escaped quotes, empty strings and literal in', async () => {
  const h = new Harness();
  await h.ok('init', 'create text t 1 2 ""', 'set t text "say \\"hello\\""'.replaceAll('\\\\', '\\'));
  assert.match(await h.run('show t'), /say/);
  await h.ok('set t text "in"');
  assert.match(await h.run('show t'), /text="in"/);
  assert.match(await h.run('set t text "oops'), /^error: unterminated double quote$/);
  assert.match(await h.run('set t text "a"junk'), /^error: expected whitespace/);
});

test('nested composite move and scale multiply coordinates, sizes but not stroke width', async () => {
  const h = new Harness();
  await h.ok('init', 'create g outer', 'create g inner in outer',
    'create rect r 10 20 30 40 in inner', 'create circle c 5 6 7 in inner',
    'create ellipse e 1 2 3 4 in inner', 'create line l 1 2 3 4 in inner',
    'create text t 8 9 "label" in inner', 'set r stroke-width 2', 'move outer 1 2', 'scale outer 2');
  assert.match(await h.run('show r'), /x=22 y=44 width=60 height=80 stroke-width=2/);
  assert.match(await h.run('show c'), /cx=12 cy=16 r=14/);
  assert.match(await h.run('show e'), /cx=4 cy=8 rx=6 ry=8/);
  assert.match(await h.run('show l'), /x1=4 y1=8 x2=8 y2=12/);
  assert.match(await h.run('show t'), /x=18 y=22 text="label"/);
  const before = await h.run('tree');
  assert.equal(await h.run('scale outer 0'), 'error: scale factor must be positive');
  assert.equal(await h.run('scale outer -1'), 'error: scale factor must be positive');
  assert.equal(await h.run('tree'), before);
});

test('set whitelist, negative dimensions and malformed numeric values are atomic', async () => {
  const h = new Harness();
  await h.ok('init', 'create g g', 'create rect r 0 0 1 1', 'set g fill red', 'set g stroke black', 'set g stroke-width 2');
  assert.equal(await h.run('set g x 1'), 'error: unknown attribute: x');
  assert.equal(await h.run('set r font-size 16'), 'error: unknown attribute: font-size');
  assert.equal(await h.run('set r text "no"'), 'error: unknown attribute: text');
  assert.equal(await h.run('set r width -1'), 'error: width must be non-negative');
  for (const value of ['NaN', 'Infinity', '1e999', '0x10', '5px', '""']) {
    assert.match(await h.run(`move r ${value} 0`), /^error: invalid number:/);
  }
  assert.match(await h.run('show r'), /width=1 height=1/);
});

test('numeric overflow rolls back even after earlier children were changed', async () => {
  const h = new Harness();
  await h.ok('init', 'create g g', 'create rect a 1 2 3 4 in g', 'create rect b 1e308 2 3 4 in g');
  const before = await h.run('tree');
  assert.match(await h.run('scale g 2'), /^error:/);
  assert.equal(await h.run('tree'), before);
  await h.ok('undo');
  assert.equal(await h.run('show b'), 'error: no such shape: b');
});

test('group uses document order, preserves sibling slot and is one undo unit', async () => {
  const h = new Harness();
  await h.ok('init', 'create g root', 'create g before in root', 'create g a in root', 'create g b in root', 'create g after in root');
  const before = await h.run('tree');
  await h.ok('group pair b a');
  const grouped = await h.run('tree');
  assert.equal(await h.run('tree pair'), 'g#pair\n├── g#a\n└── g#b');
  assert.match(await h.run('show pair'), /parent=g#root/);
  await h.ok('undo'); assert.equal(await h.run('tree'), before);
  await h.ok('redo'); assert.equal(await h.run('tree'), grouped);
  await h.ok('ungroup pair'); assert.equal(await h.run('tree'), before);
});

test('group across parents moves selected subtrees to root without losing unselected nodes', async () => {
  const h = new Harness();
  await h.ok('init', 'create g p', 'create g q', 'create circle a 1 2 3 in p', 'create circle b 4 5 6 in q',
    'create circle stay 7 8 9 in p', 'group pair b a');
  assert.match(await h.run('show pair'), /parent=svg/);
  assert.match(await h.run('show a'), /parent=g#pair/);
  assert.match(await h.run('show stay'), /parent=g#p/);
  assert.match(await h.run('tree pair'), /circle#a[\s\S]*circle#b/);
});

test('ancestor/member overlap, duplicate members and addto cycles fail without changing history', async () => {
  const h = new Harness();
  await h.ok('init', 'create g a', 'create g b in a', 'create rect r 0 0 2 3 in b');
  const before = await h.run('tree');
  assert.equal(await h.run('group bad r a'), 'error: cannot group a container into its own descendant: a');
  assert.equal(await h.run('group bad r r'), 'error: duplicate group member');
  assert.equal(await h.run('addto b a'), 'error: cannot group a container into its own descendant: a');
  assert.equal(await h.run('addto a a'), 'error: cannot group a container into its own descendant: a');
  assert.equal(await h.run('tree'), before);
  await h.ok('undo'); assert.equal(await h.run('show r'), 'error: no such shape: r');
});

test('ungroup nested group restores position, top-level group cannot be dissolved', async () => {
  const h = new Harness();
  await h.ok('init', 'create g root', 'create g before in root', 'create g inner in root',
    'create g a in inner', 'create g b in inner', 'create g after in root', 'ungroup inner');
  assert.match(await h.run('tree root'), /g#before[\s\S]*g#a[\s\S]*g#b[\s\S]*g#after/);
  assert.equal(await h.run('ungroup root'), 'error: cannot ungroup top-level container: root');
  await h.ok('undo'); assert.match(await h.run('show a'), /parent=g#inner/);
});

test('addto appends, z-order is sibling-local, and delete removes descendants as one unit', async () => {
  const h = new Harness();
  await h.ok('init', 'create g g', 'create g a in g', 'create g b in g', 'create g c', 'addto g c');
  assert.match(await h.run('tree g'), /g#a[\s\S]*g#b[\s\S]*g#c/);
  await h.ok('front a'); assert.match(await h.run('tree g'), /g#b[\s\S]*g#c[\s\S]*g#a/);
  await h.ok('back c'); assert.match(await h.run('tree g'), /g#c[\s\S]*g#b[\s\S]*g#a/);
  const before = await h.run('tree');
  await h.ok('delete g'); assert.equal(await h.run('tree'), 'svg (800x600)');
  await h.ok('undo'); assert.equal(await h.run('tree'), before);
});

test('new successful edit clears redo; failed edits and displays leave redo intact', async () => {
  const h = new Harness();
  await h.ok('init', 'create circle c 1 2 3', 'move c 3 4', 'undo');
  await h.run('set c nope 1'); await h.ok('tree', 'show c', 'canvas', 'help', 'redo');
  assert.match(await h.run('show c'), /cx=4 cy=6/);
  await h.ok('undo', 'set c fill blue');
  assert.equal(await h.run('redo'), 'error: nothing to redo');
});

test('document commands create barriers, next editing starts a fresh undo history', async () => {
  const h = new Harness();
  for (const io of ['init 400 300', 'save demo.svg', 'canvas 200 100', 'read demo.svg']) {
    await h.ok('init', 'create g g', io);
    assert.equal(await h.run('undo'), 'error: undo not allowed after io command');
    assert.equal(await h.run('redo'), 'error: undo not allowed after io command');
    await h.ok('create g newGroup', 'undo');
    assert.equal(await h.run('show newGroup'), 'error: no such shape: newGroup');
    assert.equal(await h.run('undo'), 'error: nothing to undo');
  }
});

test('failed IO, failed canvas/init leave document, file association and undo untouched', async () => {
  const h = new Harness();
  await h.ok('init', 'create circle c 1 2 3', 'save original.svg', 'move c 4 5');
  const before = await h.run('tree');
  assert.equal(await h.run('read missing.svg'), 'error: cannot read file: missing.svg');
  assert.equal(await h.run('save readonly.svg'), 'error: cannot write file: readonly.svg');
  assert.match(await h.run('canvas -1 0'), /^error:/);
  assert.match(await h.run('init 0 0'), /^error:/);
  assert.equal(await h.run('tree'), before);
  await h.ok('undo'); assert.match(await h.run('show c'), /cx=1 cy=2/);
  assert.match(await h.ok('save'), /^saved to original.svg/);
});

test('read warnings, implicit save target, init detaches path, later save uses last successful path', async () => {
  const h = new Harness();
  h.store.put('external.svg', '<svg width="10" height="20"><rect width="1" height="2"/></svg>');
  assert.match(await h.ok('read external.svg'), /warning: assigned id rect1 to unnamed <rect>/);
  await h.ok('set rect1 fill red', 'save');
  assert.match(h.store.get('external.svg')!, /fill="red"/);
  await h.ok('save another.svg', 'move rect1 1 2', 'save');
  assert.match(h.store.get('another.svg')!, /x="1" y="2"/);
  await h.ok('init'); assert.equal(await h.run('save'), 'error: no file path. use save <file.svg>');
});

test('parse and import errors keep redo and current document intact', async () => {
  const h = new Harness();
  await h.ok('init', 'create g g', 'undo');
  h.store.put('bad.svg', '<svg><rect id="x"/><circle id="x"/></svg>');
  const before = await h.run('tree');
  for (const command of ['read bad.svg', 'canvas 10', 'move g 1', 'create g too many', 'set x text "unterminated']) {
    assert.match(await h.run(command), /^error:/);
    assert.equal(await h.run('tree'), before);
  }
  await h.ok('redo'); assert.match(await h.run('tree'), /g#g/);
});
