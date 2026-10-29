import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from './CommandDispatcher.js';
export class Repl {
  constructor(private readonly dispatcher: CommandDispatcher, private readonly input: Readable,
    private readonly output: Writable, private readonly interactive: boolean) {}
  async run(): Promise<void> {
    const lines = createInterface({ input: this.input, output: this.output, terminal: this.interactive });
    lines.setPrompt('svg> ');
    if (this.interactive) { this.output.write("svg-editor 0.1 — type 'help' for commands\n"); lines.prompt(); }
    // Sequential await is essential: piped read/save must finish before the next edit.
    for await (const line of lines) {
      const result = await this.dispatcher.dispatch(line);
      if (result !== undefined) this.output.write(result + '\n');
      if (this.interactive) lines.prompt();
    }
  }
}
