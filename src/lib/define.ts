/**
 * @leizm/mysql
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

/**
 * 回调函数
 */
export interface Callback<T> {
  (err: Error | null, ret?: T): void;
  promise?: Promise<T>;
}
