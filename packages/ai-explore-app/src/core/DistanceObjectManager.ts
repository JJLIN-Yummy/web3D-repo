import * as THREE from "three";

interface DistanceItem {
  eid: number;
  // 物体本地包围盒（固定不变，add的时候只算一次）
  localAABB: THREE.Box3;
  // 每一帧计算出来的世界空间包围盒
  worldAABB: THREE.Box3;
  loaded: boolean;
  helper?: THREE.Box3Helper;
}

interface AddObjectOpt {
  eid: number;
  mesh: THREE.Object3D;
  debug?: boolean; // 是否绘制AABB黄色线框
  isUpdate?: boolean;
  getTransform: () => {
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
  };
}

export class DistanceObjectManager {
  private scene: THREE.Scene;
  private readonly loadRadius: number;
  private readonly unloadRadius: number;
  private objectMap = new Map<number, DistanceItem>();
  private updateObjectAABBQueue: ((...args: any[]) => any)[] = [];

  // 复用缓存（放类里面）
  private readonly euler = new THREE.Euler();
  private readonly quat = new THREE.Quaternion();
  private readonly posVec = new THREE.Vector3();
  private readonly scaleVec = new THREE.Vector3();
  private readonly mat4 = new THREE.Matrix4();

  constructor(opt: {
    scene: THREE.Scene;
    loadRadius: number;
    unloadRadius: number;
  }) {
    this.scene = opt.scene;
    this.loadRadius = opt.loadRadius;
    this.unloadRadius = opt.unloadRadius;
  }

  public addObject(opt: AddObjectOpt): void {
    const { eid, mesh, debug = false } = opt;
    if (this.objectMap.has(eid)) return;

    // 【只执行一次】获取物体原始局部包围盒
    mesh.updateMatrixWorld(true);
    const localAABB = new THREE.Box3().setFromObject(mesh);
    const worldAABB = localAABB.clone().applyMatrix4(mesh.matrixWorld);

    let helper: THREE.Box3Helper | undefined;
    if (debug) {
      helper = new THREE.Box3Helper(worldAABB, 0xffff00);
      this.scene.add(helper);
    }

    this.objectMap.set(eid, {
      eid,
      localAABB,
      worldAABB,
      loaded: false,
      helper,
    });

    if (opt.isUpdate) {
      this.updateObjectAABBQueue.push(() =>
        this.updateObjectAABB({
          eid,
          getTransform: opt.getTransform,
        })
      );
    }
  }

  public removeObject(eid: number): void {
    const item = this.objectMap.get(eid);
    if (!item) return;

    // 清理调试线框
    if (item.helper) {
      this.scene.remove(item.helper);
      item.helper.geometry.dispose();
    }
    if (item.loaded) {
      item.loaded = false;
    }
    this.objectMap.delete(eid);
  }

  public updateObjectAABB(opt: {
    eid: number;
    getTransform: () => {
      x: number;
      y: number;
      z: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      scaleX: number;
      scaleY: number;
      scaleZ: number;
    };
  }): void {
    const { eid } = opt;
    const { x, y, z, rotX, rotY, rotZ, scaleX, scaleY, scaleZ } =
      opt.getTransform();
    const item = this.objectMap.get(eid);
    if (!item) return;

    // 组装变换矩阵（完全从你传入的数值生成，不靠mesh）
    this.posVec.set(x, y, z);
    this.euler.set(rotX, rotY, rotZ);
    this.quat.setFromEuler(this.euler);
    this.scaleVec.set(scaleX, scaleY, scaleZ);
    this.mat4.compose(this.posVec, this.quat, this.scaleVec);

    // localAABB * 矩阵 = 新的世界包围盒
    item.worldAABB.copy(item.localAABB).applyMatrix4(this.mat4);

    // 更新调试盒子
    if (item.helper) {
      item.helper.box = item.worldAABB;
    }
  }

  public update(
    cameraWorldPos: THREE.Vector3,
    onLoad?: (eidList: number[]) => void,
    onUnload?: (eidList: number[]) => void
  ): void {
    const loadList: number[] = [];
    const unloadList: number[] = [];
    const closestPoint = new THREE.Vector3(); // 复用向量，减少new开销

    for (const item of this.objectMap.values()) {
      item.worldAABB.clampPoint(cameraWorldPos, closestPoint);
      const dist = cameraWorldPos.distanceTo(closestPoint);

      if (!item.loaded && dist < this.loadRadius) {
        item.loaded = true;
        loadList.push(item.eid);
      }
      if (item.loaded && dist > this.unloadRadius) {
        item.loaded = false;
        unloadList.push(item.eid);
      }
    }

    if (loadList.length && onLoad) onLoad(loadList);
    if (unloadList.length && onUnload) onUnload(unloadList);
    this.runUpdateObjectAABBQueue();
  }

  public runUpdateObjectAABBQueue() {
    this.updateObjectAABBQueue.forEach((cb) => {
      cb();
    });
  }

  /**
   * 获取当前满足距离、已经加载的物体eid
   */
  public getVisibleEids(): number[] {
    const list: number[] = [];
    for (const item of this.objectMap.values()) {
      if (item.loaded) {
        list.push(item.eid);
      }
    }
    return list;
  }
}
