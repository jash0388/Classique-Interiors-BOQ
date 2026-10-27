declare module "archiver" {
  import { Transform } from "node:stream";

  interface ArchiverEntryOptions {
    name: string;
    prefix?: string;
    stats?: { size?: number; mode?: number; mtime?: Date };
    date?: Date;
    store?: boolean;
  }

  class Archiver extends Transform {
    append(source: Buffer | StreamSource, options: ArchiverEntryOptions): this;
    directory(dir: string, destpath?: string | false): this;
    finalize(): Promise<void>;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "warning", listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    pointer(): number;
  }

  type StreamSource = NodeJS.ReadableStream;

  function archiver(format: "zip" | "tar", options?: { zlib?: { level?: number } }): Archiver;

  export = archiver;
}
