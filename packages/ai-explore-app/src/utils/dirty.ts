// 给实体打上脏标记，支持叠加
import { type IWorld, hasComponent, addComponent } from "bitecs";
import { Dirty } from "../ecs/ECSWorld";

export const dirtyQueue: boolean[] = [];
export function markDirty(world: IWorld, eid: number, flag: number) {
  if (!hasComponent(world, Dirty, eid)) {
    addComponent(world, Dirty, eid);
    Dirty.transform[eid] = 0;
  }
  Dirty.transform[eid] |= flag;
  dirtyQueue.push(true);
}

// 清除实体脏标记
export function clearDirty(world: IWorld, eid: number, flag?: number) {
  if (!hasComponent(world, Dirty, eid)) return;
  if (flag === undefined) {
    Dirty.transform[eid] = 0;
  } else {
    Dirty.transform[eid] &= ~flag;
  }
}

// 判断实体是否存在指定脏标记
export function isDirty(world: IWorld, eid: number, flag: number): boolean {
  if (!hasComponent(world, Dirty, eid)) return false;
  return (Dirty.transform[eid] & flag) !== 0;
}

export const hasDirty = () => {
  return dirtyQueue.length > 0;
};

export const cleanDirty = () => {
  dirtyQueue.splice(0, dirtyQueue.length);
};
