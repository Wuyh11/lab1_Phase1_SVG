import { HistoryEntry } from './HistoryEntry.js';
import type { Command } from './commands/Command.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
export class CommandHistory {
  private undoEntries: HistoryEntry[] = [];
  private redoEntries: HistoryEntry[] = [];
  private locked = true;
  execute(command: Command, current: SvgDocument): { document: SvgDocument; message: string } {
    const working = current.clone();
    const message = command.execute(working);
    this.undoEntries.push(new HistoryEntry(command, current.clone(), working.clone(), message));
    this.redoEntries = []; this.locked = false;
    return { document: working, message };
  }
  barrier(): void { this.undoEntries = []; this.redoEntries = []; this.locked = true; }
  undo(): { document: SvgDocument; message: string } {
    this.ensureUnlocked();
    const entry = this.undoEntries.pop();
    if (!entry) throw new Error('nothing to undo');
    this.redoEntries.push(entry);
    return { document: entry.before(), message: `undone ${entry.commandName}: ${entry.message}` };
  }
  redo(): { document: SvgDocument; message: string } {
    this.ensureUnlocked();
    const entry = this.redoEntries.pop();
    if (!entry) throw new Error('nothing to redo');
    this.undoEntries.push(entry); return { document: entry.after(), message: `redone: ${entry.message}` };
  }
  private ensureUnlocked(): void { if (this.locked) throw new Error('undo not allowed after io command'); }
}
