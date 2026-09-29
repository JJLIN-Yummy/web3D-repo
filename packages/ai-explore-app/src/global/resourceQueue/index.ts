import {
  isAsyncFunction,
  isEmptyArray,
  isFunction,
  isNull,
  MyObject,
  TaskManager,
  throwTypeError,
} from "@common/tools";
import type {
  resourceQueueStatusEnumValueType,
  resourceQueueTaskType,
} from "./type";
import { type ITaskManager, type taskListType } from "@common/tools";
import { resourceQueueStatusEnum } from "./enum";
import {
  type EventCallback,
  EventEmitterLite,
} from "@/design/eventEmitterLite/eventEmitterLite";
import { taskRunHelper } from "@/global/resourceQueue/helper";
import { runTask } from "@/utils/idleTimeTask";

export const resourceQueueEventName = {
  resolved: "resolved",
  rejected: "rejected",
  addTask: "addTask",
  fulfilled: "fulfilled",
} as const;

export class ResourceQueue<T = any> extends TaskManager<
  resourceQueueTaskType<T>
> {
  readonly #emitter = new EventEmitterLite<typeof resourceQueueEventName>();

  tasksStatus: {
    [key: string]: resourceQueueStatusEnumValueType;
  } = {};
  // statistic:{
  //     [key:string]:{
  //         resolved: resourceQueueTaskType[],
  //         rejected: resourceQueueTaskType[],
  //         pending: resourceQueueTaskType[]
  //     }
  // } = {
  //
  // }

  // ✨对外代理on，外部使用跟之前完全一样
  on<K extends keyof typeof resourceQueueEventName>(
    eventName: K,
    cb: EventCallback
  ) {
    return this.#emitter.on(eventName, cb);
  }

  public addTask(
    newTasks: taskListType<resourceQueueTaskType<T>>
  ): ITaskManager<resourceQueueTaskType<T>> {
    const taskType = MyObject.keys(newTasks); //获取任务的类型
    for (let i = 0; i < taskType.length; i++) {
      //循环每个任务 并且添加到任务队列
      const type = taskType[i]; //当前的任务类型
      const tasks = newTasks[type]; //当前的任务
      // if (!this.tasks[type]) {
      //   this.tasks[type] = [];
      // }
      if (isEmptyArray(tasks)) continue; //如果当前的任务为空，就continue
      if (!this.tasks[type]) {
        this.tasks[type] = [];
      }

      tasks.forEach((task: resourceQueueTaskType<T>) => {
        if (!isFunction(task.run))
          throw throwTypeError("run", task.run, "必须传入函数");

        if (this.tasksStatus[type] !== resourceQueueStatusEnum.pending) {
          this.tasksStatus[type] = resourceQueueStatusEnum.waiting;
        }

        task.status = resourceQueueStatusEnum.waiting;
        task.result = void 0;
        this.tasks[type].push(task);

        //触发钩子
        this.#emitter.emit(resourceQueueEventName.addTask);
      });
    }

    return this;
  }

  public runTask(type: string) {
    if (isNull(this.tasks)) return;
    // if(this.tasksStatus[type] === resourceQueueStatusEnum.pending) return;

    const tasks = this.tasks[type]; //当前的任务
    // console.log(111111111111,this.tasks,tasks , type)

    try {
      if (isEmptyArray(tasks)) return; //如果当前的任务为空，就continue

      //如果不为空，把任务一个一个取出来执行

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (task.status === resourceQueueStatusEnum.waiting) {
          // if(tasks[i].id){
          //     console.log( tasks[i].id)
          //
          // }
          this.tasksStatus[type] = resourceQueueStatusEnum.pending;
          this.addResult(type, task);
        }
      }
    } catch (e) {}
  }

  public async execTask(type: string, task: resourceQueueTaskType<T>) {
    this.tasksStatus[type] = resourceQueueStatusEnum.pending;
    let result;

    if (isAsyncFunction(task.run)) {
      result = await task.run();
    } else {
      result = task.run();
    }
    return result;
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  public async addResult(type: string, task: resourceQueueTaskType<T>) {
    // const statisticList = this.statistic[type];
    try {
      task.status = resourceQueueStatusEnum.pending;
      const execTask = this.execTask.bind(this, type, task);
      const f = async function* () {
        return await execTask();
      };
      task.result = await runTask(f());
      // console.log(task.result)

      task.status = resourceQueueStatusEnum.resolved;
      task.finished &&
        task.finished({ status: task.status, result: task.result as T });
      this.#emitter.emit(resourceQueueEventName.resolved);
      // const resolvedList = statisticList['resolved'] ?? (statisticList['resolved'] = []);
      // resolvedList.push(task);
    } catch (e) {
      console.log(e);
      task.status = resourceQueueStatusEnum.rejected;
      task.result = void 0;
      task.filed && task.filed({ status: task.status, result: e as Error });
      this.#emitter.emit(resourceQueueEventName.rejected);
      // const rejectList = statisticList['rejected'] ?? (statisticList['rejected'] = []);
      // rejectList.push(task);
    } finally {
      // console.log(this.tasks,this.tasksStatus[type],this.isRunFinish(type))
      if (this.isRunFinish(type)) {
        this.tasksStatus[type] = resourceQueueStatusEnum.resolved;
        // console.log('完成')

        requestAnimationFrame(() => {
          if (this.tasksStatus[type] === resourceQueueStatusEnum.resolved) {
            // console.log('真的完成')
            this.#emitter.emit(resourceQueueEventName.fulfilled, { type });
          }
        });
      } else {
        this.runTask(type);
      }
    }
  }

  isRunFinish(type: string) {
    const tasks = this.tasks[type];
    if (isEmptyArray(tasks)) return;
    const statistic = this.getTasksByStatus(
      type,
      resourceQueueStatusEnum.resolved
    ) ?? { count: 0 };

    if (statistic.count === tasks.length) return true;
  }

  public getTasksByStatus(
    type: string,
    status?: resourceQueueStatusEnumValueType
  ) {
    const tasks = this.tasks[type];
    if (!tasks || isEmptyArray(tasks)) return;
    let count = 0;
    const arr: resourceQueueTaskType<T>[] = [];
    tasks.forEach((task) => {
      if (!status) {
        count++;
        arr.push(task);
        return;
      }
      if (task.status === status) {
        count++;
        arr.push(task);
        return;
      }
    });

    return {
      count,
      tasks: arr,
    };
  }
}

export const resourceQueue = new ResourceQueue();
export const taskRunHelperEmitter = taskRunHelper(3);
