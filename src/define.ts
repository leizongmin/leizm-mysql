/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

/**
 * 键值对对象
 */
export interface KVObject {
  [key: string]: any;
}

/**
 * 回调函数
 */
export interface Callback<T> {
  (err: Error | null, ret?: T): void;
  promise?: Promise<T>;
}
