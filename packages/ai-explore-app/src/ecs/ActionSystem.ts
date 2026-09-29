import type { ThreeApp } from "../core/ThreeApp";
import {
  Transform,
  Color,
  CubeRenderer,
  CubeRenderQuery,
  PrimitiveMesh,
  ShapeStringToCode,
  PrimitiveShapeCode,
  GLBModelQuery,
  DIRTY_TRANSFORM,
  DIRTY_COLOR,
  DIRTY_GEOMETRY,
} from "./ECSWorld";
import { addComponent, addEntity } from "bitecs";
import * as THREE from "three";
import type { ThreeModelResponseSuccess } from "../api/type";
import type { EntityId } from "bitecs";
import { MathUtils } from "three";
import { markDirty } from "../utils/dirty";

export type Action =
  | {
      type: "spawn";
      position: { x: number; y: number; z: number };
      color: { r: number; g: number; b: number };
    }
  | {
      type: "remove";
      x: number;
      z: number;
    }
  | {
      type: "move";
      fromX: number;
      fromZ: number;
      toX: number;
      toZ: number;
      toY?: number;
    }
  | {
      type: "ai_spawn";
      modelData: ThreeModelResponseSuccess;
      spawnPos?: { x: number; y: number; z: number };
    };

export class ActionSystem {
  private readonly app: ThreeApp;

  constructor(app: ThreeApp) {
    this.app = app;
  }

  exec(action: Action): void | Promise<void> {
    switch (action.type) {
      case "spawn":
        this.handleSpawn(action);
        break;
      case "remove":
        this.handleRemove(action);
        break;
      case "move":
        this.handleMove(action);
        break;
      case "ai_spawn":
        return this.handleAiSpawn(action);
    }
  }

  private handleSpawn(action: Extract<Action, { type: "spawn" }>): void {
    const world = this.app.ecs.world;
    const eid = addEntity(world);

    addComponent(world, Transform, eid);
    addComponent(world, Color, eid);
    addComponent(world, CubeRenderer, eid);
    addComponent(world, PrimitiveMesh, eid);
    markDirty(world, eid, DIRTY_TRANSFORM | DIRTY_COLOR | DIRTY_GEOMETRY);

    Transform.x[eid] = action.position.x;
    Transform.y[eid] = action.position.y;
    Transform.z[eid] = action.position.z;
    Transform.rotX[eid] = 0;
    Transform.rotY[eid] = 0;
    Transform.rotZ[eid] = 0;
    Transform.scaleX[eid] = 1;
    Transform.scaleY[eid] = 1;
    Transform.scaleZ[eid] = 1;

    Color.r[eid] = action.color.r;
    Color.g[eid] = action.color.g;
    Color.b[eid] = action.color.b;

    PrimitiveMesh.shapeCode[eid] = PrimitiveShapeCode.BOX;
    PrimitiveMesh.width[eid] = 5;
    PrimitiveMesh.height[eid] = 5;
    PrimitiveMesh.depth[eid] = 5;
  }

  private handleRemove(action: Extract<Action, { type: "remove" }>): void {
    const cubeEntities = CubeRenderQuery(this.app.ecs.world);
    const targetX = action.x;
    const targetZ = action.z;
    for (const eid of cubeEntities) {
      const ex = Transform.x[eid];
      const ez = Transform.z[eid];
      if (Math.abs(ex - targetX) < 0.1 && Math.abs(ez - targetZ) < 0.1) {
        this.app.ecs.destroyEntity(eid);
        return;
      }
    }
    const glbEntities = GLBModelQuery(this.app.ecs.world);
    for (const eid of glbEntities) {
      const ex = Transform.x[eid];
      const ez = Transform.z[eid];
      if (Math.abs(ex - targetX) < 0.1 && Math.abs(ez - targetZ) < 0.1) {
        this.app.ecs.destroyEntity(eid);
        return;
      }
    }
  }

  private handleMove(action: Extract<Action, { type: "move" }>): void {
    const world = this.app.ecs.world;
    const { fromX, fromZ, toX, toZ, toY } = action;
    const cubeEntities = CubeRenderQuery(this.app.ecs.world);
    for (const eid of cubeEntities) {
      const ex = Transform.x[eid];
      const ez = Transform.z[eid];
      if (Math.abs(ex - fromX) < 0.1 && Math.abs(ez - fromZ) < 0.1) {
        Transform.x[eid] = toX;
        Transform.z[eid] = toZ;
        markDirty(world, eid, DIRTY_TRANSFORM);
        if (toY !== undefined) Transform.y[eid] = toY;
        break;
      }
    }
    const glbEntities = GLBModelQuery(this.app.ecs.world);
    for (const eid of glbEntities) {
      const ex = Transform.x[eid];
      const ez = Transform.z[eid];
      if (Math.abs(ex - fromX) < 0.1 && Math.abs(ez - fromZ) < 0.1) {
        Transform.x[eid] = toX;
        Transform.z[eid] = toZ;
        markDirty(world, eid, DIRTY_TRANSFORM);
        if (toY !== undefined) Transform.y[eid] = toY;
        break;
      }
    }
  }

  private async handleAiSpawn(
    action: Extract<Action, { type: "ai_spawn" }>
  ): Promise<void> {
    const { modelData, spawnPos } = action;
    const trans = modelData.transform;

    let posX: number, posY: number, posZ: number;
    if (spawnPos) {
      posX = spawnPos.x;
      posY = spawnPos.y;
      posZ = spawnPos.z;
    } else {
      [posX, posY, posZ] = trans.position;
    }

    const [rotX, rotY, rotZ] = trans.rotation;
    const [scaleX, scaleY, scaleZ] = trans.scale;
    const matInfo = modelData.material;

    if (modelData.type === "primitive" && modelData.primitive) {
      const world = this.app.ecs.world;
      const eid: EntityId = addEntity(world);

      addComponent(world, Transform, eid);
      addComponent(world, Color, eid);
      addComponent(world, CubeRenderer, eid);
      addComponent(world, PrimitiveMesh, eid);
      markDirty(world, eid, DIRTY_TRANSFORM | DIRTY_COLOR | DIRTY_GEOMETRY);

      Transform.x[eid] = posX;
      Transform.y[eid] = posY;
      Transform.z[eid] = posZ;
      Transform.rotX[eid] = MathUtils.degToRad(rotX);
      Transform.rotY[eid] = MathUtils.degToRad(rotY);
      Transform.rotZ[eid] = MathUtils.degToRad(rotZ);
      Transform.scaleX[eid] = scaleX;
      Transform.scaleY[eid] = scaleY;
      Transform.scaleZ[eid] = scaleZ;

      const p = modelData.primitive;
      PrimitiveMesh.shapeCode[eid] =
        ShapeStringToCode[p.shape] ?? PrimitiveShapeCode.BOX;
      PrimitiveMesh.width[eid] = p.size.width;
      PrimitiveMesh.height[eid] = p.size.height;
      PrimitiveMesh.depth[eid] = p.size.depth;

      const threeColor = new THREE.Color(matInfo.color);
      Color.r[eid] = threeColor.r;
      Color.g[eid] = threeColor.g;
      Color.b[eid] = threeColor.b;
      return;
    }

    // GLB沙发创建逻辑
    if (modelData.type === "model" && modelData.ossUrl) {
      const entityId = await this.app.loadAIModelToECS(modelData.ossUrl);
      if (entityId === null || entityId === void 0) return;

      const world = this.app.ecs.world;
      // 抬高Y坐标，防止埋进地面
      const finalY = posY;
      Transform.x[entityId] = posX;
      Transform.y[entityId] = finalY;
      Transform.z[entityId] = posZ;
      Transform.rotY[entityId] = MathUtils.degToRad(rotY);
      Transform.scaleX[entityId] = scaleX;
      Transform.scaleY[entityId] = scaleY;
      Transform.scaleZ[entityId] = scaleZ;
      markDirty(world, entityId, DIRTY_TRANSFORM);
    }
  }

  async initDefaultCubes() {
    const list: Extract<Action, { type: "spawn" }>[] = [
      {
        type: "spawn",
        position: { x: 8, y: 1, z: -3 },
        color: { r: 0.55, g: 0.13, b: 0.13 },
      },
      {
        type: "spawn",
        position: { x: 6, y: 1, z: 4 },
        color: { r: 0.2, g: 0.47, b: 0.85 },
      },
      {
        type: "spawn",
        position: { x: -5, y: 1, z: 2 },
        color: { r: 0.15, g: 0.67, b: 0.37 },
      },
      {
        type: "spawn",
        position: { x: -7, y: 1, z: -6 },
        color: { r: 0.9, g: 0.49, b: 0.13 },
      },
    ];
    for (const item of list) {
      this.exec(item);
      await new Promise((resolve) => queueMicrotask(resolve as VoidFunction));
    }
  }
}
