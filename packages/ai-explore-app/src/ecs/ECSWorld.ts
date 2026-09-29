import {
  createWorld,
  addEntity,
  removeEntity,
  hasComponent,
  Types,
  defineComponent,
  defineQuery,
  addComponent,
} from "bitecs";
import type { IWorld } from "bitecs";
import * as THREE from "three";
import { disposeObject } from "../utils/dispose";
import { clearDirty, isDirty } from "../utils/dirty";
import type { TileManager } from "@/core/TileStreamingManager";
import type { ThreeApp } from "@/core/ThreeApp";
import { runTask } from "@/utils/idleTimeTask";
import type { SceneQueue } from "@/global/sceneQueue";
import type { DistanceObjectManager } from "@/core/DistanceObjectManager";

export enum PrimitiveShapeCode {
  BOX = 0,
  SPHERE = 1,
  CYLINDER = 2,
  PLANE = 3,
}
export const ShapeStringToCode: Record<string, PrimitiveShapeCode> = {
  box: PrimitiveShapeCode.BOX,
  sphere: PrimitiveShapeCode.SPHERE,
  cylinder: PrimitiveShapeCode.CYLINDER,
  plane: PrimitiveShapeCode.PLANE,
};

export const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  rotX: Types.f32,
  rotY: Types.f32,
  rotZ: Types.f32,
  scaleX: Types.f32,
  scaleY: Types.f32,
  scaleZ: Types.f32,
});

export const Color = defineComponent({
  r: Types.f32,
  g: Types.f32,
  b: Types.f32,
});

export const CubeRenderer = defineComponent();
export const PrimitiveMesh = defineComponent({
  shapeCode: Types.ui8,
  width: Types.f32,
  height: Types.f32,
  depth: Types.f32,
});

export const Dirty = defineComponent({
  // 标记位，按位存储多种脏类型
  transform: Types.ui8, // 1=位置旋转缩放  2=颜色  4=几何体形状
});
// 脏标记常量
export const DIRTY_TRANSFORM = 1 << 0;
export const DIRTY_COLOR = 1 << 1;
export const DIRTY_GEOMETRY = 1 << 2;

export const TransformQuery = defineQuery([Transform]);
export const CubeRenderQuery = defineQuery([
  Transform,
  Color,
  CubeRenderer,
  PrimitiveMesh,
  Dirty,
]);
export const GLBModelTag = defineComponent();
export const GLBModelQuery = defineQuery([Transform, GLBModelTag, Dirty]);

export const GrassTag = defineComponent(); // 标记实体是草丛
export const GrassQuery = defineQuery([GrassTag]);

// GLB骨骼动画播放器组件（带动画模型共用）
export const AnimationMixerTag = defineComponent({
  isAnimation: true,
});

export const AnimationMixerTQuery = defineQuery([AnimationMixerTag]);

// 悬浮组件
export const FloatRotateTag = defineComponent({
  baseY: Types.f32, // 悬浮中心高度
  amplitude: Types.f32, // 上下浮动幅度
  floatSpeed: Types.f32, // 浮动快慢
  rotateSpeed: Types.f32, // 自转速度
});

export const FloatRotateQuery = defineQuery([FloatRotateTag, CubeRenderer]);

/**
 * ECS组件：可拾取展品标签
 * 实体挂上这个组件，就代表它可以被射线选中
 */
export const PickableTag = defineComponent({});
export const PickableQuery = defineQuery([PickableTag]);

type CreateGeoOptions = {
  shapeCode: number;
  width: number;
  height: number;
  depth: number;
};

export class ECSWorld {
  public world: IWorld;
  public entityMeshMap = new Map<number, THREE.Mesh | THREE.Group>();
  public animationMap = new Map<number, THREE.AnimationMixer>();
  public globalTime: number = 0;
  public tileManager: TileManager;
  public distanceObjectManager: DistanceObjectManager;
  private app: ThreeApp;

  constructor(option: { app: ThreeApp }) {
    this.world = createWorld();
    this.app = option.app;
    this.tileManager = this.app.tileManager;
    this.distanceObjectManager = this.app.distanceObjectManager;
  }

  getVisibleEids() {
    return [
      ...this.tileManager.getVisibleEids(),
      ...this.distanceObjectManager.getVisibleEids(),
    ];
  }

  canRenderEid(eid: number) {
    return this.getVisibleEids().indexOf(eid) > -1;
  }

  destroyEntity(eid: number, scene?: THREE.Scene) {
    removeEntity(this.world, eid);
    const obj = this.entityMeshMap.get(eid);
    if (!obj) return;
    obj.removeFromParent();
    disposeObject(obj);
    this.entityMeshMap.delete(eid);
    if (scene) scene.remove(obj);
  }

  private createGeometry(opts: CreateGeoOptions): THREE.BufferGeometry {
    const { shapeCode, width, height, depth } = opts;
    switch (shapeCode) {
      case PrimitiveShapeCode.SPHERE:
        return new THREE.SphereGeometry(width / 2, 32, 32);
      case PrimitiveShapeCode.CYLINDER:
        return new THREE.CylinderGeometry(width / 2, width / 2, height, 32);
      case PrimitiveShapeCode.PLANE:
        return new THREE.PlaneGeometry(width, depth);
      default:
        return new THREE.BoxGeometry(width, height, depth);
    }
  }

  private syncTransformSystem(scene: SceneQueue, delta: number) {
    const getMesh = (eid: number) => this.entityMeshMap.get(eid);

    this.tileManager.update(
      this.app.camera.position,
      (eids) => {
        // console.log(eids)

        const f = async function* () {
          for (let i = 0; i < eids.length; i++) {
            const eid = eids[i];
            const mesh = getMesh(eid);
            // markDirty(this.world,eid,DIRTY_TRANSFORM);

            await new Promise((resolve) => {
              setTimeout(() => {
                mesh && scene.add({ mesh });
                resolve(1);
              }, 100);
            });

            yield;
          }
        };
        runTask(f());
      },
      (eids) => {
        eids.forEach((eid) => {
          const mesh = this.entityMeshMap.get(eid);
          mesh && scene.remove({ mesh });
        });
      }
    );

    this.distanceObjectManager.update(
      this.app.camera.position,
      (eids) => {
        // console.log(eids);
        const f = function* () {
          for (let i = 0; i < eids.length; i++) {
            const eid = eids[i];
            const mesh = getMesh(eid);
            // markDirty(this.world,eid,DIRTY_TRANSFORM);
            mesh && scene.add({ mesh });
            yield;
          }
        };
        runTask(f());
      },
      (eids) => {
        eids.forEach((eid) => {
          const mesh = this.entityMeshMap.get(eid);
          mesh && scene.remove({ mesh });
        });
      }
    );

    this.globalTime += delta;
    // 1. 只同步【脏方块实体】
    const dirtyCubeEntities = CubeRenderQuery(this.world);
    for (const eid of dirtyCubeEntities) {
      if (!this.canRenderEid(eid)) continue;
      let mesh = this.entityMeshMap.get(eid) as THREE.Mesh;
      const geoOpts: CreateGeoOptions = {
        shapeCode: PrimitiveMesh.shapeCode[eid],
        width: PrimitiveMesh.width[eid],
        height: PrimitiveMesh.height[eid],
        depth: PrimitiveMesh.depth[eid],
      };

      if (!mesh) {
        const geo = this.createGeometry(geoOpts);
        const mat = new THREE.MeshStandardMaterial();
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add({ mesh });
        this.entityMeshMap.set(eid, mesh);
      } else {
        // 几何体脏标记：重建形状
        if (isDirty(this.world, eid, DIRTY_GEOMETRY)) {
          console.log("形状脏了");
          const geo = mesh.geometry;
          const needRebuild =
            (geo instanceof THREE.BoxGeometry &&
              geoOpts.shapeCode === PrimitiveShapeCode.SPHERE) ||
            (geo instanceof THREE.SphereGeometry &&
              geoOpts.shapeCode !== PrimitiveShapeCode.SPHERE) ||
            (geo instanceof THREE.CylinderGeometry &&
              geoOpts.shapeCode !== PrimitiveShapeCode.CYLINDER) ||
            (geo instanceof THREE.PlaneGeometry &&
              geoOpts.shapeCode !== PrimitiveShapeCode.PLANE);

          if (needRebuild) {
            geo.dispose();
            mesh.geometry = this.createGeometry(geoOpts);
          }
          clearDirty(this.world, eid, DIRTY_GEOMETRY);
        }
      }

      // 变换脏标记：更新位置旋转缩放
      if (isDirty(this.world, eid, DIRTY_TRANSFORM)) {
        console.log("位置脏了");
        mesh.position.set(Transform.x[eid], Transform.y[eid], Transform.z[eid]);
        mesh.rotation.set(
          Transform.rotX[eid],
          Transform.rotY[eid],
          Transform.rotZ[eid]
        );
        mesh.scale.set(
          Transform.scaleX[eid],
          Transform.scaleY[eid],
          Transform.scaleZ[eid]
        );
        clearDirty(this.world, eid, DIRTY_TRANSFORM);
      }

      // 颜色脏标记：更新材质颜色
      if (isDirty(this.world, eid, DIRTY_COLOR)) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.setRGB(Color.r[eid], Color.g[eid], Color.b[eid]);
        clearDirty(this.world, eid, DIRTY_COLOR);
      }
    }

    // 2. 只同步【脏GLB实体】
    const dirtyGlbEntities = GLBModelQuery(this.world);
    // console.log(dirtyGlbEntities )
    for (const eid of dirtyGlbEntities) {
      if (!this.canRenderEid(eid)) continue;

      // console.log(eid )
      const group = this.entityMeshMap.get(eid) as THREE.Group;
      if (!group) continue;

      if (isDirty(this.world, eid, DIRTY_TRANSFORM)) {
        // console.log('模型位置脏了')
        // console.log('模型脏了')

        group.position.set(
          Transform.x[eid],
          Transform.y[eid],
          Transform.z[eid]
        );
        group.rotation.set(
          Transform.rotX[eid],
          Transform.rotY[eid],
          Transform.rotZ[eid]
        );
        group.scale.set(
          Transform.scaleX[eid],
          Transform.scaleY[eid],
          Transform.scaleZ[eid]
        );
        clearDirty(this.world, eid, DIRTY_TRANSFORM);
      }
    }

    this.animationUpdateSystem(delta);

    this.floatRotateSystem(delta, this.globalTime);

    // setTimeout(()=>{
    //3.清理排出的物体
    for (const [eid] of this.entityMeshMap) {
      const isCubeObj = hasComponent(this.world, CubeRenderer, eid);
      const isGlbObj = hasComponent(this.world, GLBModelTag, eid);
      if (!isCubeObj && !isGlbObj) {
        // scene.remove(obj)
        // disposeObject(obj)
        // this.entityMeshMap.delete(eid)
        // removeEntity(this.world,eid);
        this.destroyEntity(eid, scene.scene);
      }
    }
    // },10000)
  }

  animationUpdateSystem(delta: number) {
    for (const [_eid, mixer] of this.animationMap) {
      // let mesh = this.ecs.entityMeshMap.get(eid) as THREE.Mesh
      mixer.update(delta);
    }
  }

  floatRotateSystem(dt: number, globalTime: number) {
    // 查询同时拥有两个组件的实体
    for (const eid of FloatRotateQuery(this.world)) {
      const obj = this.entityMeshMap.get(eid) as THREE.Group;

      // export const FloatRotateTag = defineComponent({
      //     baseY: Types.f32,     // 悬浮中心高度
      //     amplitude: Types.f32, // 上下浮动幅度
      //     floatSpeed: Types.f32,// 浮动快慢
      //     rotateSpeed: Types.f32// 自转速度
      // })

      // 上下悬浮
      const yOffset =
        Math.sin(globalTime * FloatRotateTag.floatSpeed[eid]) *
        FloatRotateTag.amplitude[eid];
      obj.position.y = FloatRotateTag.baseY[eid] + yOffset;

      // Y轴自转
      obj.rotation.y += FloatRotateTag.rotateSpeed[eid] * dt;
    }
  }

  tick(dt: number, scene: SceneQueue) {
    this.syncTransformSystem(scene, dt);
  }
}

export { addEntity, addComponent };
