declare module "lei-utils" {
  export function md5(buf: string | Buffer): string;
  export function createPromiseCallback<T>(): {
    (err: Error | null, ret?: T): void;
    promise: Promise<T>;
  };
}
