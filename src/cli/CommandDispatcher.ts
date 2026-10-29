import { Editor } from '../application/Editor.js';
import { InputNumber } from '../application/InputNumber.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { Tokenizer } from './Tokenizer.js';
import { Arguments } from './Arguments.js';

export class CommandDispatcher {
  private readonly tokenizer = new Tokenizer();
  // Name dispatch point 1/2. Handler registration becomes a CommandProvider slot later.
  private readonly handlers = new Map<string, { syntax: string; run: (args: Arguments) => string | Promise<string> }>();
  constructor(private readonly editor: Editor) {
    this.register('init', 'init [w] [h]', args => {
      args.count(0, 2); return editor.init(args.optional(0) === undefined ? 800 : InputNumber.parse(args.at(0)), args.optional(1) === undefined ? 600 : InputNumber.parse(args.at(1)));
    });
    this.register('read', 'read <file.svg>', args => editor.read(args.count(1).at(0)));
    this.register('save', 'save [file.svg]', args => editor.save(args.count(0, 1).optional(0)));
    this.register('canvas', 'canvas [w h]', args => {
      args.count(0, 2);
      if (args.length === 1) throw new Error('usage: canvas [w h]');
      return args.length ? editor.canvas(InputNumber.parse(args.at(0)), InputNumber.parse(args.at(1))) : editor.canvas();
    });
    this.register('create', 'create <type> <id> [params…] [in <containerId>]', args => {
      args.count(2, Infinity); const tail = args.createTail();
      return editor.execute(new CreateCommand(args.at(0), args.at(1), tail.params, tail.parent));
    });
    this.register('delete', 'delete <id>', args => editor.execute(new DeleteCommand(args.count(1).at(0))));
    this.register('move', 'move <id> <dx> <dy>', args => {
      args.count(3); return editor.execute(new MoveCommand(args.at(0), InputNumber.parse(args.at(1)), InputNumber.parse(args.at(2))));
    });
    this.register('scale', 'scale <id> <factor>', args => {
      args.count(2); return editor.execute(new ScaleCommand(args.at(0), InputNumber.parse(args.at(1))));
    });
    this.register('set', 'set <id> <attr> <value>', args => {
      args.count(3); return editor.execute(new SetCommand(args.at(0), args.at(1), args.at(2)));
    });
    this.register('group', 'group <newGid> <id1> [id2…]', args => {
      args.count(2, Infinity); return editor.execute(new GroupCommand(args.at(0), args.values(1)));
    });
    this.register('ungroup', 'ungroup <gid>', args => editor.execute(new UngroupCommand(args.count(1).at(0))));
    this.register('addto', 'addto <gid> <id>', args => {
      args.count(2); return editor.execute(new AddToCommand(args.at(0), args.at(1)));
    });
    this.register('front', 'front <id>', args => editor.execute(new FrontCommand(args.count(1).at(0))));
    this.register('back', 'back <id>', args => editor.execute(new BackCommand(args.count(1).at(0))));
    this.register('tree', 'tree [id]', args => editor.tree(args.count(0, 1).optional(0)));
    this.register('show', 'show <id>', args => editor.show(args.count(1).at(0)));
    this.register('undo', 'undo', args => { args.count(0); return editor.undo(); });
    this.register('redo', 'redo', args => { args.count(0); return editor.redo(); });
    this.register('help', 'help', args => { args.count(0); return [...this.handlers.values()].map(handler => handler.syntax).join('\n'); });
  }
  async dispatch(line: string): Promise<string | undefined> {
    try {
      const tokens = this.tokenizer.tokenize(line);
      if (!tokens.length) return undefined;
      const name = tokens[0]!.value;
      const handler = this.handlers.get(name);
      if (!handler) throw new Error(`unknown command: ${name}`);
      if (!['help', 'init', 'read'].includes(name)) this.editor.requireDocument();
      return await handler.run(new Arguments(tokens.slice(1), handler.syntax));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `error: ${message.replace(/[\r\n]+/g, ' ')}`;
    }
  }
  private register(name: string, syntax: string, run: (args: Arguments) => string | Promise<string>): void {
    this.handlers.set(name, { syntax, run });
  }
}
