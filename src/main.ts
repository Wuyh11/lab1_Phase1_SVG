import { Editor } from './application/Editor.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { Repl } from './cli/Repl.js';
import { LocalDocumentStore } from './infrastructure/LocalDocumentStore.js';

const editor = new Editor(new LocalDocumentStore());
const dispatcher = new CommandDispatcher(editor);
await new Repl(dispatcher, process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY)).run();
