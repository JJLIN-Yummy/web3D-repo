import * as THREE from "three";

// ===================== 类型定义 & 枚举 =====================
/**
 * 瓦片状态枚举，控制瓦片完整生命周期
 */
enum TileState {
  // 空闲：离相机很远，未加载任何渲染资源
  IDLE = "idle",
  // 等待加载：进入加载范围，等待外部加载资源
  PENDING = "pending",
  // 已加载：外部资源就绪，物体渲染可见
  LOADED = "loaded",
  // 待卸载：超出卸载半径，等待外部清理资源
  UNLOADING = "unloading",
}

/**
 * 单个瓦片信息结构，仅保存引用，不存模型数据
 */
interface TileInfo {
  // tile格子索引，不是世界坐标 {x: tile索引, z: tile索引}
  tileCoord: { x: number; z: number };
  // 瓦片空间包围盒，用于距离判断
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  // 当前瓦片状态
  state: TileState;
  // 归属这个瓦片的ECS实体ID列表，仅存eid引用
  objectEidList: number[];
  // 调试用瓦片线框
  debugBox?: THREE.Mesh;
}

/**
 * 外部传入物体的数据结构
 * 外部调用addObjectToTile时，只需要提供eid和世界坐标
 */
interface TileObjectItem {
  eid: number; // ECS实体ID
  worldPos: THREE.Vector3; // 物体世界坐标，外部传入
}

/**
 * 简易SpatialHash 实现（内置，不用引入第三方库）
 * 作用：快速空间查询，存储eid与位置
 */
export class SpatialHash {
  // 空间哈希每个格子大小，建议和tileSize保持一致
  private cellSize: number;
  // 存储数据 Map<key, Set<eid>>
  private map = new Map<string, Set<number>>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /**
   * 内部：坐标转hash key
   */
  private posToKey(pos: THREE.Vector3): string {
    const x = Math.floor(pos.x / this.cellSize);
    const z = Math.floor(pos.z / this.cellSize);
    return `${x},${z}`;
  }

  /**
   * 插入实体
   */
  public insert(eid: number, pos: THREE.Vector3): void {
    const key = this.posToKey(pos);
    if (!this.map.has(key)) {
      this.map.set(key, new Set());
    }
    this.map.get(key)!.add(eid);
  }

  /**
   * 删除实体
   */
  public remove(eid: number, pos: THREE.Vector3): void {
    const key = this.posToKey(pos);
    const set = this.map.get(key);
    if (set) {
      set.delete(eid);
      if (set.size === 0) {
        this.map.delete(key);
      }
    }
  }

  /**
   * 查询某个位置附近所有实体（预留接口，后续拾取/空间查询用）
   */
  public query(pos: THREE.Vector3, radius: number): number[] {
    const result: number[] = [];
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${z}`;
        const set = this.map.get(key);
        if (set) result.push(...set);
      }
    }
    return result;
  }
}

export class TileManager {
  // 瓦片单块尺寸 20单位，肉眼可以明显看到加载卸载
  private readonly tileSize: number;
  // 加载半径：瓦片中心距离相机小于该值，触发onTileLoad
  private readonly loadRadius: number;
  // 卸载半径：大于该值触发卸载，大于加载半径，做 hysteresis 防抖，防止相机抖动反复加载卸载
  private readonly unloadRadius: number;

  // 存储全部瓦片 Map<tileKey, TileInfo>，tileKey = "x,z"
  private tileMap = new Map<string, TileInfo>();
  // 空间哈希实例
  private spatialHash: SpatialHash;
  // three场景引用，仅用来添加调试框
  private scene: THREE.Scene;
  // 是否开启调试瓦片线框
  private debugMode: boolean;

  /**
   * 构造函数
   * @param option.scene three场景，仅用于调试可视化
   * @param option.spatialHash 空间哈希实例
   * @param option.debugMode 是否绘制瓦片绿色线框
   */
  constructor(option: {
    scene: THREE.Scene;
    spatialHash: SpatialHash;
    debugMode: boolean;
    tileSize: number;
    loadRadius: number;
    unloadRadius: number;
  }) {
    this.scene = option.scene;
    this.spatialHash = option.spatialHash;
    this.debugMode = option.debugMode;
    this.tileSize = option.tileSize;
    this.loadRadius = option.loadRadius;
    this.unloadRadius = option.unloadRadius;
  }

  /**
   * 【对外API】世界坐标 → 瓦片索引坐标
   * Manager内部自动计算，外部不需要关心tile索引
   * @param worldPos 物体世界坐标
   */
  public worldPosToTileCoord(worldPos: THREE.Vector3): {
    x: number;
    z: number;
  } {
    const tileX = Math.floor(worldPos.x / this.tileSize);
    const tileZ = Math.floor(worldPos.z / this.tileSize);
    return { x: tileX, z: tileZ };
  }

  /**
   * 【对外API】外部调用，传入物体(eid + worldPos)，自动归类到对应瓦片
   * @param item {eid, worldPos} 外部传入，只需要真实世界坐标
   */
  public addObjectToTile(item: TileObjectItem): void {
    // 根据物体世界坐标，算出归属哪一个tile
    const tileCoord = this.worldPosToTileCoord(item.worldPos);
    const tileKey = `${tileCoord.x},${tileCoord.z}`;

    // 如果这个tile不存在，新建瓦片
    if (!this.tileMap.has(tileKey)) {
      this.createNewTile(tileCoord);
    }
    // 获取瓦片实例
    const tile = this.tileMap.get(tileKey)!;

    // 将实体ID存入瓦片列表
    tile.objectEidList.push(item.eid);
    // 将实体注册到空间哈希
    this.spatialHash.insert(item.eid, item.worldPos);
  }

  /**
   * 【对外API】从瓦片和空间哈希移除物体
   * @param eid ECS实体ID
   * @param worldPos 物体旧世界坐标
   */
  public removeObjectFromTile(eid: number, worldPos: THREE.Vector3): void {
    // 根据旧坐标找到所属瓦片
    const tileCoord = this.worldPosToTileCoord(worldPos);
    const tileKey = `${tileCoord.x},${tileCoord.z}`;
    const tile = this.tileMap.get(tileKey);
    if (!tile) return;

    // 过滤删除该实体
    tile.objectEidList = tile.objectEidList.filter((id) => id !== eid);
    // 空间哈希删除
    this.spatialHash.remove(eid, worldPos);

    // 如果瓦片物体清空，标记为待卸载
    if (tile.objectEidList.length === 0) {
      tile.state = TileState.UNLOADING;
    }
  }

  /**
   * 【对外API】动态物体移动后，更新瓦片归属
   * 外部物体位置变化时调用，内部先删旧瓦片，再加到新瓦片
   * @param eid 实体ID
   * @param oldPos 移动前坐标
   * @param newPos 移动后新的世界坐标
   */
  public moveObjectUpdateTile(
    eid: number,
    oldPos: THREE.Vector3,
    newPos: THREE.Vector3
  ): void {
    this.removeObjectFromTile(eid, oldPos);
    this.addObjectToTile({ eid, worldPos: newPos });
  }

  /**
   * 【对外API】每帧执行，放在rAF渲染循环
   * ✅ 修改：回调只传入 eid 数组，不再传tile对象，外部自己处理ECS
   * @param cameraWorldPos 相机世界坐标
   * @param onTileLoad 瓦片进入范围回调：参数是当前瓦片内所有实体id数组 number[]
   * @param onTileUnload 瓦片远离回调：参数是当前瓦片内所有实体id数组 number[]
   */
  public update(
    cameraWorldPos: THREE.Vector3,
    onTileLoad?: (eidList: number[]) => void,
    onTileUnload?: (eidList: number[]) => void
  ): void {
    // 遍历所有已创建瓦片
    for (const [_tileKey, tile] of this.tileMap) {
      // 计算瓦片中心点世界坐标
      const tileCenterX = (tile.bounds.min.x + tile.bounds.max.x) / 2;
      const tileCenterZ = (tile.bounds.min.z + tile.bounds.max.z) / 2;
      const tileCenter = new THREE.Vector3(tileCenterX, 0, tileCenterZ);

      // 相机到瓦片中心距离
      const distance = cameraWorldPos.distanceTo(tileCenter);

      // ========= 加载逻辑 =========
      // 在加载范围内，并且瓦片处于空闲状态
      if (distance < this.loadRadius && tile.state === TileState.IDLE) {
        tile.state = TileState.PENDING;
        // 只把实体ID数组丢给外部，外部自己去ECS查Transform
        onTileLoad && onTileLoad([...tile.objectEidList]);
        tile.state = TileState.LOADED;
      }

      // ========= 卸载逻辑 =========
      // 超出卸载半径，瓦片已加载
      if (distance > this.unloadRadius && tile.state === TileState.LOADED) {
        tile.state = TileState.UNLOADING;
        // 卸载回调，同样只返回eid数组
        onTileUnload && onTileUnload([...tile.objectEidList]);
        tile.state = TileState.IDLE;

        // 调试模式：移除瓦片线框
        if (this.debugMode && tile.debugBox) {
          this.scene.remove(tile.debugBox);
        }
        // 清空瓦片实体列表
        // tile.objectEidList = [];
        // 删除瓦片
        // this.tileMap.delete(tileKey);
      }
    }
  }

  /**
   * 获取当前所有可视（已加载）瓦片内的全部实体EID
   * @returns number[] 所有可视eid数组
   */
  public getVisibleEids(): number[] {
    // 新建数组存放结果
    const result: number[] = [];

    // 遍历tileMap里全部瓦片
    for (const [_tileKey, tile] of this.tileMap) {
      // 只取【已经加载完成】的瓦片
      if (tile.state === TileState.LOADED) {
        // 把瓦片内的eid全部合并进结果数组
        result.push(...tile.objectEidList);
      }
    }
    return result;
  }

  /**
   * 对外：获取所有已经加载完成的瓦片内全部eid（调试/备用）
   */
  public getAllLoadedEidLists(): number[][] {
    return Array.from(this.tileMap.values())
      .filter((tile) => tile.state === TileState.LOADED)
      .map((tile) => [...tile.objectEidList]);
  }

  /**
   * 内部函数：新建瓦片，计算包围盒，创建调试线框
   * @param tileCoord 瓦片索引 x,z
   */
  private createNewTile(tileCoord: { x: number; z: number }) {
    const halfSize = this.tileSize / 2;
    // 瓦片中心世界坐标
    const centerX = tileCoord.x * this.tileSize + halfSize;
    const centerZ = tileCoord.z * this.tileSize + halfSize;

    // 构建瓦片包围盒 Y轴上下预留一点空间
    const min = new THREE.Vector3(centerX - halfSize, -10, centerZ - halfSize);
    const max = new THREE.Vector3(centerX + halfSize, 10, centerZ + halfSize);

    const tileInfo: TileInfo = {
      tileCoord,
      bounds: { min, max },
      state: TileState.IDLE,
      objectEidList: [],
      debugBox: undefined,
    };

    // 开启调试，绘制绿色线框盒子，直观看到瓦片范围
    if (this.debugMode) {
      const boxGeo = new THREE.BoxGeometry(this.tileSize, 0.2, this.tileSize);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const boxMesh = new THREE.Mesh(boxGeo, mat);
      boxMesh.position.set(centerX, 0, centerZ);
      this.scene.add(boxMesh);
      tileInfo.debugBox = boxMesh;
    }

    const tileKey = `${tileCoord.x},${tileCoord.z}`;
    this.tileMap.set(tileKey, tileInfo);
  }
}
