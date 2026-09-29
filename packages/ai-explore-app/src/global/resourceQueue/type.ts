import type { resourceQueueStatusEnum } from "./enum";

export type resourceQueueStatusEnumType = typeof resourceQueueStatusEnum;
export type resourceQueueStatusEnumValueType =
  resourceQueueStatusEnumType[keyof resourceQueueStatusEnumType];
export type resourceQueueTaskType<R> = {
  status: resourceQueueStatusEnumValueType;
  run: (...args: any[]) => any;
  result?: R;
  finished?: (option: {
    status: resourceQueueStatusEnumValueType;
    result: R;
  }) => any;
  filed?: (option: {
    status: resourceQueueStatusEnumValueType;
    result: Error;
  }) => any;
};
