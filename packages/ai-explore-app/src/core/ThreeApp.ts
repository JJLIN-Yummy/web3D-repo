import * as THREE from "three";
import { Loop } from "./Loop";
import { Input } from "./Input";
import { FPC } from "./FPC";
import {
  ECSWorld,
  Transform,
  GLBModelTag,
  DIRTY_TRANSFORM,
  AnimationMixerTag,
  PickableQuery,
} from "../ecs/ECSWorld";
import { addComponent } from "bitecs";
import { addEntity } from "bitecs";
import { disposeObject } from "../utils/dispose";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  EquirectangularReflectionMapping,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from "three";
import { ActionSystem } from "../ecs/ActionSystem";
import { markDirty } from "../utils/dirty";
import { threeGeneratorQuery, threeGeneratorSubmit } from "@/api/generate";
import { type ThreeModelResponseSuccess } from "@/api/type";
import { isArray } from "@common/tools";
import { runTask } from "@/utils/idleTimeTask";
import { SpatialHash, TileManager } from "@/core/TileStreamingManager";
import { SceneQueue } from "@/global/sceneQueue";
import { DistanceObjectManager } from "@/core/DistanceObjectManager";
import { TextureManager } from "@/core/textureManager";
import { ShaderManager } from "@/core/shaderManger";

type EntityId = number;

export type ThreeAppOptions = {
  container: HTMLElement;
  hdrPath?: string;
  exposure?: number;
  fov?: number;
  playerHeight?: number;
  enableShadow?: boolean;
  event?: Partial<WorldCallback>;
};

export type WorldCallback = {
  // 准星瞄准展品发生变化时触发
  onHoverChange: (info?: { title: string; description: string } | null) => void;
};

export const entityMsgMap = new Map<number, Partial<any>>();

export let activeClickId = -1;

export class ThreeApp {
  public readonly scene = new THREE.Scene();
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  public readonly loop = new Loop();
  public readonly input: Input;
  public readonly fpc: FPC;
  public readonly actionSystem: ActionSystem;
  public readonly ecs: ECSWorld;
  public skyTexture: THREE.Texture | null = null;
  // private options: Required<ThreeAppOptions>;
  private resizeHandler: () => void;
  private raycaster = new THREE.Raycaster();
  public sceneQueue = new SceneQueue({ scene: this.scene });

  public tileManager: TileManager;
  public spatialHash: SpatialHash;

  public distanceObjectManager: DistanceObjectManager;

  public textureManager: TextureManager;
  public shaderManager: ShaderManager;

  /**
   * 反向映射表
   * key:隐形碰撞盒Mesh
   * value:ECS实体ID
   * 射线检测命中物体后，通过这个Map找到对应的展品实体
   */
  public objToEntity = new Map<THREE.Object3D, number>();
  private callback: Partial<WorldCallback> = {};

  constructor(rawOptions: ThreeAppOptions) {
    this.callback = rawOptions.event ?? {};
    const options: Required<ThreeAppOptions> = {
      container: rawOptions.container,
      hdrPath: rawOptions.hdrPath ?? "",
      exposure: rawOptions.exposure ?? 0.7,
      fov: rawOptions.fov ?? 60,
      playerHeight: rawOptions.playerHeight ?? 1.8,
      enableShadow: rawOptions.enableShadow ?? true,
      event: this.callback,
    };
    // this.options = options;

    const { container, hdrPath, exposure, fov, playerHeight, enableShadow } =
      options;

    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
    this.camera.position.y = playerHeight;

    container.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);
    this.fpc = new FPC(this.camera, this.input);
    this.fpc.setSpawnPoint(new THREE.Vector3(-0, 1.2, 0), 0);
    this.actionSystem = new ActionSystem(this);

    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = exposure;

    this.textureManager = new TextureManager({ renderer: this.renderer });
    this.shaderManager = new ShaderManager({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
    });

    if (enableShadow) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.spatialHash = new SpatialHash(10);
    this.tileManager = new TileManager({
      scene: this.scene,
      spatialHash: this.spatialHash,
      debugMode: true,
      tileSize: 10,
      unloadRadius: 30,
      loadRadius: 20,
    });
    this.distanceObjectManager = new DistanceObjectManager({
      scene: this.scene,
      loadRadius: 20,
      unloadRadius: 30,
    });

    this.ecs = new ECSWorld({ app: this });

    this.resizeHandler = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    this.resizeHandler();
    window.addEventListener("resize", this.resizeHandler);

    // let canRun = true;
    this.loop.add((dt) => {
      this.fpc.update(dt);

      this.ecs.tick(dt, this.sceneQueue);

      const scene = this.scene;
      const camera = this.camera;
      const renderer = this.renderer;
      const f = function* () {
        renderer.render(scene, camera);
        yield;
      };
      runTask(f())
        .then(() => {})
        .catch(() => {})
        .finally(() => {});
      // this.renderer.render(this.scene, this.camera);

      // if(hasDirty()){
      // cleanDirty();
      // }
      this.input.frameReset();
      // this.hoverSystem()
    });

    if (hdrPath) {
      this.loadHDRSky(hdrPath);
    } else {
      this.scene.background = new THREE.Color(0x4a86c2);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  loadHDRSky(path: string): Promise<THREE.Texture | null> {
    return new Promise((resolve) => {
      const hdrLoader = new RGBELoader();
      hdrLoader.crossOrigin = "anonymous";
      hdrLoader.load(
        path,
        (texture) => {
          if (!texture) {
            this.scene.background = new THREE.Color(0x4a86c2);
            resolve(null);
            return;
          }
          texture.mapping = EquirectangularReflectionMapping;
          this.skyTexture = texture;
          this.scene.background = texture;
          this.scene.environment = texture;
          resolve(texture);
        },
        undefined,
        (err) => {
          console.error("HDR加载失败", err);
          this.scene.background = new THREE.Color(0x4a86c2);
          this.skyTexture = null;
          this.scene.environment = null;
          resolve(null);
        }
      );
    });
  }

  /** 加载GLB，创建ECS实体，返回实体ID */
  async loadAIModelToECS(glbUrl: string): Promise<EntityId | null> {
    try {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(glbUrl);
      const scene = gltf.scene;

      // gltf.animations.forEach(clip=>{
      //     // console.log('动画名字:', clip.name)
      // })

      const rootObj = gltf.scene;

      const w = this.ecs.world;
      const eid = addEntity(w);
      // console.log("ai模型Id", eid)

      // 挂载必须组件
      addComponent(w, Transform, eid);
      addComponent(w, GLBModelTag, eid);
      markDirty(w, eid, DIRTY_TRANSFORM);
      // 全局开启阴影
      rootObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const animClips = gltf.animations;
      const hasClip = animClips.length > 0;
      let hasBone = false;
      scene.traverse((obj) => {
        // SkinnedMesh = 带骨骼蒙皮
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
          hasBone = true;
        }
      });
      if (hasClip && hasBone) {
        const mixer = new THREE.AnimationMixer(scene);
        const action = mixer.clipAction(animClips[0]);
        action.play();
        addComponent(w, AnimationMixerTag, eid);
        this.ecs.animationMap.set(eid, mixer);
      }

      // console.log("已存入entityMeshMap, 校验取值:", eid,this.ecs.entityMeshMap.get(eid))
      // this.scene.add(rootObj)
      this.ecs.entityMeshMap.set(eid, rootObj);

      return eid;
    } catch (err) {
      console.error("AI GLB模型加载失败", err);
      return null;
    }
  }

  async generateAIModelByText(
    prompt: string,
    thread_id: string,
    spawnPos?: { x: number; y: number; z: number }
  ): Promise<any> {
    try {
      // 1. 请求后端获取AI物体数据
      const { data: submitRes } = await threeGeneratorSubmit({
        data: { message: prompt, thread_id },
      }).response();
      if (!submitRes || !submitRes.IsSuccess) {
        console.error("生成失败");
        return null;
      }
      const submitValue = submitRes.Value;
      if (!submitValue || !submitValue.task_id) {
        console.error("生成失败");
        return null;
      }
      const task_id = submitValue.task_id;

      //2.查看任务
      let objData;

      await new Promise((resolve, reject) => {
        let timer: NodeJS.Timeout | null = setInterval(() => {
          (async () => {
            const { data: queryRes } = await threeGeneratorQuery({
              params: { task_id },
            }).response();

            if (!queryRes || !queryRes.IsSuccess) {
              console.error("系统错误");
              return;
            }
            const queryValue = queryRes.Value;
            if (!queryValue) {
              console.error("响应错误");
              reject();
              return;
            }

            if (queryValue.status === "fail") {
              console.error("生成失败");
              reject();
              if (timer) clearInterval(timer);

              return;
            }

            if (queryValue.status === "running") return;

            objData = queryValue.data as ThreeModelResponseSuccess;
            if (timer) clearInterval(timer);
            timer = null;

            resolve(1);
          })();

          // const queryRes = {
          //     "IsSuccess": false,
          //     "Message": "任务正在执行中，请稍后重试",
          //     "Value": {
          //         "status": "running"
          //     }
          // }
        }, 5000);
      });

      if (isArray(objData)) {
        objData.forEach((item) => {
          this.actionSystem.exec({
            type: "ai_spawn",
            modelData: item,
            spawnPos,
          });
        });
      } else {
        this.actionSystem.exec({
          type: "ai_spawn",
          modelData: objData,
          spawnPos,
        });
      }
    } catch (err) {
      console.error("AI生成失败", err);
    }
  }

  hoverSystem() {
    // 从相机屏幕中心点(0,0)发射射线
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    // 检测射线与场景物体相交，true代表递归检测子物体
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    let targetEntity: number = -1;

    // 如果有物体被射线击中
    if (hits.length > 0) {
      // 获取被击中的那个物体
      const hitObject = hits[0].object;
      // 判断这个物体是否是我们注册过的碰撞盒
      if (this.objToEntity.has(hitObject)) {
        const eid = this.objToEntity.get(hitObject)!;
        // 再判断该实体是否具备可拾取组件
        const pickableMesh = PickableQuery(this.ecs.world);
        for (const pid of pickableMesh) {
          if (Number(pid) === Number(eid)) {
            targetEntity = eid;
          }
        }
      }
    }

    // 选中展品：调用回调把展品信息发给Vue
    if (targetEntity !== -1) {
      // console.log(targetEntity)
      activeClickId = targetEntity;
      this.callback.onHoverChange && this.callback.onHoverChange();
    } else {
      // 没有选中展品，通知Vue清空提示
      // this.callback.onHoverChange && this.callback.onHoverChange(null)
    }
  }

  createAutoHitBox(targetGroup: THREE.Group, expand = 0.3) {
    // 创建包围盒对象
    const bbox = new THREE.Box3();
    // 递归扫描group内所有子物体，计算出整个展品的边界
    bbox.setFromObject(targetGroup, true);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    // 获取包围盒尺寸
    bbox.getSize(size);
    // 获取包围盒中心点坐标
    bbox.getCenter(center);

    // 尺寸向外扩充余量
    size.x += expand;
    size.y += expand;
    size.z += expand;

    // 生成碰撞盒几何体
    const hitGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
      // 调试时打开查看碰撞盒： visible:true, wireframe:true, color:0xff0000
    });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    // 碰撞盒移动到展品包围盒中心
    hitBox.position.copy(center);
    return hitBox;
  }

  start() {
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
    window.removeEventListener("resize", this.resizeHandler);
    disposeObject(this.scene);
    this.renderer.dispose();
    this.ecs.entityMeshMap.clear();
  }
}
