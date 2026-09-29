import { isFunction } from "@common/tools";

export type taskType =
  | Generator<unknown, unknown, unknown>
  | AsyncGenerator<unknown, unknown, unknown>;

export const _runTask = (task: taskType, resolve: (v?: any) => void) => {
  const start = Date.now();

  if (isFunction(window.requestIdleCallback)) {
    requestIdleCallback((idle) => {
      (async () => {
        if (idle.timeRemaining() > 5) {
          const { done, value } = await task.next();
          if (!done) {
            _runTask(task, resolve);
          } else {
            resolve(value);
          }
        } else {
          _runTask(task, resolve);
        }
      })();
    });
  } else {
    requestAnimationFrame(() => {
      (async () => {
        if (Date.now() - start < 11.6) {
          const { done, value } = await task.next();
          if (!done) {
            _runTask(task, resolve);
          } else {
            resolve(value);
          }
          resolve();
        } else {
          _runTask(task, resolve);
        }
      })();
    });
  }
};
export const runTask = async <T = any>(task: taskType): Promise<T> => {
  return new Promise<T>((resolve) => {
    _runTask(task, resolve);
  }).catch((e) => {
    return e;
  });
};
