import * as THREE from "three";
import type { ThreeApp } from "./ThreeApp";
import { entityMsgMap } from "./ThreeApp";
import {
  Color,
  CubeRenderer,
  CubeRenderQuery,
  DIRTY_TRANSFORM,
  FloatRotateTag,
  GLBModelTag,
  GrassQuery,
  GrassTag,
  PickableTag,
  PrimitiveMesh,
  Transform,
} from "../ecs/ECSWorld";
import { disposeObject } from "../utils/dispose";
import { Sky } from "three/examples/jsm/objects/Sky";
import { setupGroundTexture } from "@/utils";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { addComponent, addEntity, type IWorld } from "bitecs";
import { markDirty } from "@/utils/dirty";

import { resourceQueue, taskRunHelperEmitter } from "@/global/resourceQueue";
import { resourceQueueName } from "@/enums";
import { resourceQueueStatusEnum } from "@/global/resourceQueue/enum";
import type { resourceQueueTaskType } from "@/global/resourceQueue/type";
import { runTask } from "@/utils/idleTimeTask";
import { loadTileTexture } from "@/utils/textureDecoderWorker";
import { uuidv4 } from "@common/tools";
import { getStaticResourceUrl } from "@/utils/env";

export class World {
  public grassModel: THREE.Group | null = null;
  constructor(private readonly app: ThreeApp) {}

  async init() {
    this.createGround();
    this.createLightSource();
    this.createDebugHelper();
    this.loadGrassModel();
    await this.createRoad();
    const creatRoadTask = {
      id: uuidv4(),
      status: resourceQueueStatusEnum.pending,
      run: taskRunHelperEmitter(this.createRoad.bind(this)),
      result: null,
    };
    resourceQueue.addTask({
      [resourceQueueName.common]: [creatRoadTask],
    });

    // this.app.loop.add(()=>{
    //     this.grassWindSystem(this.app.ecs.world)
    // })

    // this.createModel({url:'/public/model/human/girl.glb', position:{x:3,y:0,z:3,},scale:{x:0.5,y:0.5,z:0.5}})
    // this.createModel({url:'/public/model/human/girl-walking.glb', position:{x:8,y:0,z:3,},scale:{x:1,y:1,z:1}})
    // this.createModel({url:'/public/model/human/anime_character_girl_1.glb', position:{x:6,y:0,z:3,},scale:{x:1,y:1,z:1}})
    // this.createModel({url:'/public/model/human/jogging-girl.glb', position:{x:10,y:0,z:3,},scale:{x:1,y:1,z:1}})

    // this.createSky()
    // setTimeout(async ()=>{

    const arr = [
      {
        url: "/logo/html.png",
        composeOption: {
          position: { x: -47, y: 0, z: -3 },
        },
        title: "HTML",
        content:
          "111111111111111111111111111111111111111111111111111111111111111111111111",
      },
      {
        url: "/logo/css3.png",
        composeOption: {
          position: { x: -47, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "CSS",
        content: "",
      },
      {
        url: "/logo/js.png",
        composeOption: {
          position: { x: -45, y: 0, z: -3 },
        },
        title: "JS",
        content: "",
      },
      {
        url: "/logo/vue.png",
        composeOption: {
          position: { x: -45, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "VUE",
        content: "",
      },
      {
        url: "/logo/react.png",
        composeOption: {
          position: { x: -43, y: 0, z: -3 },
        },
        title: "REACT",
        content: "",
      },
      {
        url: "/logo/pinia.png",
        composeOption: {
          position: { x: -43, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "PINIA",
        content: "",
      },
      {
        url: "/logo/nodejs.png",
        composeOption: {
          position: { x: -41, y: 0, z: -3 },
        },
        title: "NODEJS",
        content: "",
      },
      {
        url: "/logo/vite.png",
        composeOption: {
          position: { x: -41, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "VITE",
        content: "",
      },
      {
        url: "/logo/tailwind-css.png",
        composeOption: {
          position: { x: -39, y: 0, z: -3 },
        },
        title: "TAILWIND-CSS",
        content: "",
      },
      {
        url: "/logo/java.png",
        composeOption: {
          position: { x: -39, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "JAVA",
        content: "",
      },
      {
        url: "/logo/spring.png",
        composeOption: {
          position: { x: -37, y: 0, z: -3 },
        },
        title: "SPRING",
        content: "",
      },
      {
        url: "/logo/redis.png",
        composeOption: {
          position: { x: -37, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "REDIS",
        content: "",
      },
      {
        url: "/logo/docker.png",
        composeOption: {
          position: { x: -35, y: 0, z: -3 },
        },
        title: "DOCKER",
        content: "",
      },
      {
        url: "/logo/kubernets.png",
        composeOption: {
          position: { x: -35, y: 0, z: 3 },
          rotate: { y: Math.PI },
        },
        title: "KUBERNETS",
        content: "",
      },
    ];

    const pedestalFunc = this.createModelComponent.bind(this, {
      url: getStaticResourceUrl("/model/pedestal/pedestal.glb"),
    });
    // const preRender = this.preRender.bind(this);
    let pedestal;
    const pedestalTask = {
      id: 1,
      status: resourceQueueStatusEnum.pending,
      run: taskRunHelperEmitter(pedestalFunc),
      result: null,
      finished: ({ result }) => {
        pedestal = result;

        arr.slice(0, 14).forEach((item) => {
          // const createLOGOComponent = this.createLOGOComponent.bind(this,{url: item.url});
          // const composeFunc = this.composePedestal_LOGO.bind(this, {pedestal:pedestal.clone(),logo:logo.mesh,position:item.composeOption.position,rotate:item.composeOption.rotate})
          const taskFunc = async () => {
            const logo = await this.createLOGOComponent({
              url: getStaticResourceUrl(item.url),
            });
            if (!logo.mesh) return;
            return this.composePedestal_LOGO({
              pedestal: pedestal.clone(),
              logo: logo.mesh,
              position: item.composeOption.position,
              rotate: item.composeOption.rotate,
            });
          };
          const task: resourceQueueTaskType<number | null> = {
            status: resourceQueueStatusEnum.pending,
            run: taskRunHelperEmitter(taskFunc),
            result: null,
          };
          resourceQueue.addTask({
            [resourceQueueName.common]: [task],
          });
          task.finished = ({ result: id }) => {
            // resourceQueue.runTask(resourceQueueName.common);
            if (id === null || id === void 0) return;
            const f = function* () {
              yield;
              resourceQueue.runTask(resourceQueueName.common);
              yield;
              entityMsgMap.set(id, {
                title: item.title,
                content: item.content,
              });
              // yield;
              // preRender();
              // yield;
            };
            runTask(f());

            // let timer = setTimeout(()=>{
            //     const logo = result;
            //     if(!logo) return;
            //     const id = this.composePedestal_LOGO({pedestal:pedestal.clone(),logo:logo.mesh,position:item.composeOption.position,rotate:item.composeOption.rotate});
            //     resourceQueue.runTask(resourceQueueName.common);
            //     entityMsgMap.set(id, {
            //         title: item.title,
            //         content: item.content
            //     })
            //     timer = null;
            //     clearTimeout(timer);
            //
            // },2000)
          };
        });
      },
    };
    resourceQueue.addTask({
      [resourceQueueName.common]: [pedestalTask],
    });

    // this.createModel({url:'/public/model/furniture/sofa.glb', position:{x:0,y:0,z:0}})

    // },1000)
  }

  preRender() {
    this.app.render();
  }

  private createGround() {
    const texLoader = new THREE.TextureLoader();
    const preRender = this.preRender.bind(this);

    const loaderFunc = async () => {
      const diffuse = await texLoader.loadAsync(
        getStaticResourceUrl("/textures/ground/rocky_terrain_02_diff_1k.jpg")
      );
      const normal = await texLoader.loadAsync(
        getStaticResourceUrl("/textures/ground/rocky_terrain_02_nor_gl_1k.jpg")
      );
      const rough = await texLoader.loadAsync(
        getStaticResourceUrl("/textures/ground/rocky_terrain_02_rough_1k.jpg")
      );

      return {
        diffuse,
        normal,
        rough,
      };
    };

    const task = {
      status: resourceQueueStatusEnum.pending,
      run: taskRunHelperEmitter(loaderFunc),
      result: null,
      finished: ({ result }) => {
        const { diffuse, normal, rough } = result;
        const diffuseTex = setupGroundTexture(diffuse);
        const normalTex = setupGroundTexture(normal);
        const roughTex = setupGroundTexture(rough);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({
          map: diffuseTex,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(0.2, 0.2), // 凹凸强度，数值越大起伏越明显
          roughnessMap: roughTex,
          roughness: 0.95,
          metalness: 0,
        });

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        // 地面接收方块投射的阴影
        ground.receiveShadow = true;
        this.app.scene.add(ground);
        preRender();
      },
    };

    resourceQueue.addTask({
      [resourceQueueName.common]: [task],
    });
  }

  public loadGrassModel() {
    const loader = new GLTFLoader();
    // 把解压出来的 grass.glb 放到 public/models/ 下
    const gltfFunc = () =>
      loader.loadAsync(getStaticResourceUrl("/model/plant/grass/grass.glb"));

    const task = {
      status: resourceQueueStatusEnum.pending,
      run: taskRunHelperEmitter(gltfFunc),
      result: null,
      finished: ({ result: gltf }) => {
        const grassTemplate = gltf.scene;
        // 循环生成150丛草
        for (let i = 0; i < 150; i++) {
          // 1. ECS创建实体
          const eid = addEntity(this.app.ecs.world);
          // 2. 挂载标记组件，识别草丛实体
          addComponent(this.app.ecs.world, GrassTag, eid);
          addComponent(this.app.ecs.world, Transform, eid); // 位置旋转缩放组件
          addComponent(this.app.ecs.world, GLBModelTag, eid);
          markDirty(this.app.ecs.world, eid, DIRTY_TRANSFORM);

          //createRoad

          // 3. 克隆3D模型
          const grass = grassTemplate.clone();
          const x = (Math.random() - 0.5) * 100;
          const z = (Math.random() - 0.5) * 100;
          // grass.position.set(x, 0, z)
          // grass.rotation.y = Math.random()*Math.PI*2
          const scale = 1.0 + Math.random() * 1.2 + 10;
          // grass.scale.set(scale, scale, scale)

          Transform.x[eid] = x;
          Transform.y[eid] = 0;
          Transform.z[eid] = z;
          Transform.scaleX[eid] = scale;
          Transform.scaleY[eid] = scale;
          Transform.scaleZ[eid] = scale;

          // 4. EID和Three模型映射（替代grassInstances数组）
          this.app.ecs.entityMeshMap.set(eid, grass);
          // this.app.scene.add(grass)
          this.app.tileManager.addObjectToTile({
            eid,
            worldPos: new THREE.Vector3(
              Transform.x[eid],
              Transform.y[eid],
              Transform.z[eid]
            ),
          });
        }
      },
    };
    resourceQueue.addTask({
      [resourceQueueName.common]: [task],
    });

    // loader.load('/public/model/plant/grass/grass.glb', gltf => {

    // })
  }

  private createLightSource() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.app.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(15, 25, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    this.app.scene.add(sunLight);
    // this.app.scene.add(new THREE.CameraHelper(sunLight.shadow.camera))
  }

  private createDebugHelper() {
    const axesHelper = new THREE.AxesHelper(10);
    this.app.scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(100, 50);
    this.app.scene.add(gridHelper);
  }

  private createSky() {
    // 1. 物理大气天空主体
    const sky = new Sky();
    sky.scale.setScalar(1200); // 超大包裹范围，无穿模
    this.app.scene.add(sky);

    const skyU = sky.material.uniforms;
    // 太阳光向量，和你的DirectionalLight位置完全同步，光影色调统一
    const sunVector = new THREE.Vector3(20, 40, 15).normalize();
    skyU.sunPosition.value.copy(sunVector);

    // 高级写实参数（不发白、深邃蓝天，无白雾）
    skyU.turbidity.value = 2.2; // 大气浑浊度，低=干净通透蓝天
    skyU.rayleigh.value = 0.7; // 瑞利散射，控制蓝色浓度，数值低不会泛白
    skyU.mieCoefficient.value = 0.0012;
    skyU.mieDirectionalG.value = 0.72;

    // 2. 指数雾，营造空间层次感（高级氛围感核心）
    this.app.scene.fog = new THREE.FogExp2(0x82a7d0, 0.006);
    // 雾色和天空上层蓝色统一，不会割裂
    this.app.scene.background = new THREE.Color(0x5088c8);
  }

  // 每一帧执行的草丛风吹系统
  public grassWindSystem(w: IWorld) {
    const grassEids = GrassQuery(w);
    const time = Date.now() * 0.0003;

    for (const eid of grassEids) {
      const grass = this.app.ecs.entityMeshMap.get(eid);
      if (!grass) continue;
      const offset = eid * 0.25;
      grass.rotation.z = Math.sin(time + offset) * 0.07;
    }
  }

  public async createModel(option: {
    url: string;
    position: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  }) {
    // const eid =  await this.app.loadAIModelToECS(option.url);
    const preRender = this.preRender.bind(this);
    return new Promise((resolve) => {
      const modelFunc = () => this.app.loadAIModelToECS(option.url);

      const f = async function* () {
        return await modelFunc();
      };

      const task: resourceQueueTaskType<number | null> = {
        status: resourceQueueStatusEnum.pending,
        run: taskRunHelperEmitter(() => runTask(f())),
        result: null,
        finished: ({ result: eid }) => {
          if (eid === null || eid === void 0) return;
          // const mesh = this.app.ecs.entityMeshMap.get(eid)
          const { x: t_x, y: t_y, z: t_z } = option.position;
          Transform.x[eid] = t_x;
          Transform.y[eid] = t_y;
          Transform.z[eid] = t_z;
          // Transform.rotY[entityId] = MathUtils.degToRad(rotY)
          const { x: s_x, y: s_y, z: s_z } = option.scale ?? {};
          Transform.scaleX[eid] = s_x ?? 1;
          Transform.scaleY[eid] = s_y ?? 1;
          Transform.scaleZ[eid] = s_z ?? 1;
          markDirty(this.app.ecs.world, eid, DIRTY_TRANSFORM);
          // Transform.rotY[eid] = y
          // Transform.scaleX[eid] = scaleX
          // Transform.scaleY[eid] = scaleY
          // Transform.scaleZ[eid] = scaleZ
          resolve(eid);
          preRender();
        },
      };
      resourceQueue.addTask({
        [resourceQueueName.common]: [task],
      });
    });
  }

  public async createModelComponent(option: { url: string }) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(option.url);
    const rootObj = gltf.scene;
    return rootObj;
  }
  public async createLOGOComponent(option: { url: string }) {
    const logoGeo = new THREE.PlaneGeometry(1.8, 1.1);
    // const texLoader = new THREE.TextureLoader();
    // const logoTex = await texLoader.loadAsync(option.url)
    const { texture: logoTex } = (await loadTileTexture(option.url)) ?? {};

    if (logoTex === null || logoTex === void 0) return { mesh: null };
    logoTex.colorSpace = THREE.SRGBColorSpace;

    await this.app.textureManager.warmup({ texture: logoTex });

    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    // 相对于Group原点，放在展台上方
    logoMesh.position.y = 0.95;

    await this.app.shaderManager.warmup({ mesh: logoMesh });

    return { mesh: logoMesh };
  }

  public composePedestal_LOGO(option: {
    pedestal: THREE.Group;
    logo: THREE.Mesh;
    position?: Partial<{ x: number; y: number; z: number }>;
    scale?: Partial<{ x: number; y: number; z: number }>;
    rotate?: Partial<{ x: number; y: number; z: number }>;
  }) {
    const rootGroup = new THREE.Group();
    option.pedestal.position.y = 0;
    option.logo.position.y = 3;

    //大小
    option.pedestal.scale.x = 0.1;
    option.pedestal.scale.y = 0.1;
    option.pedestal.scale.z = 0.1;

    option.logo.scale.x = 1;
    option.logo.scale.y = 1;
    option.logo.scale.z = 1;

    const logoId = addEntity(this.app.ecs.world);
    this.app.ecs.entityMeshMap.set(logoId, option.logo);
    addComponent(this.app.ecs.world, FloatRotateTag, logoId);
    addComponent(this.app.ecs.world, CubeRenderer, logoId);
    FloatRotateTag.baseY[logoId] = 2;
    FloatRotateTag.amplitude[logoId] = 0.4; //上下飘0.4米
    FloatRotateTag.floatSpeed[logoId] = 0.9;
    FloatRotateTag.rotateSpeed[logoId] = 0.3; //缓慢旋转

    rootGroup.add(option.pedestal);
    rootGroup.add(option.logo);
    // this.app.scene.add(rootGroup)

    const hitBox = this.app.createAutoHitBox(rootGroup);
    rootGroup.add(hitBox);

    //创建实体
    const eid = addEntity(this.app.ecs.world) as number;
    this.app.ecs.entityMeshMap.set(eid, rootGroup);
    addComponent(this.app.ecs.world, Transform, eid);
    addComponent(this.app.ecs.world, GLBModelTag, eid);

    addComponent(this.app.ecs.world, PickableTag, eid);
    this.app.objToEntity.set(hitBox, eid);
    markDirty(this.app.ecs.world, eid, DIRTY_TRANSFORM);

    const { x: t_x, y: t_y, z: t_z } = option.position ?? {};
    Transform.x[eid] = t_x ?? 0;
    Transform.y[eid] = t_y ?? 0;
    Transform.z[eid] = t_z ?? 0;
    const { x: s_x, y: s_y, z: s_z } = option.scale ?? {};
    Transform.scaleX[eid] = s_x ?? 0.5;
    Transform.scaleY[eid] = s_y ?? 0.5;
    Transform.scaleZ[eid] = s_z ?? 0.5;
    const { x: r_x, y: r_y, z: r_z } = option.rotate ?? {};
    Transform.rotX[eid] = r_x ?? Math.PI * 2;
    Transform.rotY[eid] = r_y ?? Math.PI * 2;
    Transform.rotZ[eid] = r_z ?? Math.PI * 2;

    const meshList: THREE.Mesh[] = [];
    rootGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshList.push(obj as THREE.Mesh);
      }
    });

    const saved = meshList.map((m) => m.frustumCulled);
    meshList.forEach((m) => (m.frustumCulled = false));
    this.app.renderer.render(this.app.scene, this.app.camera);
    meshList.forEach((m, idx) => (m.frustumCulled = saved[idx]));

    //添加到瓦片
    this.app.tileManager.addObjectToTile({
      eid,
      worldPos: new THREE.Vector3(t_x, t_y, t_z),
    });

    // PickableTag.title[eid] = "Vue Logo"
    // PickableTag.description[eid] = "前端框架Vue展品"

    return eid;
  }

  async createRoad() {
    // 参数：长50米，宽6米
    const roadGeo = new THREE.PlaneGeometry(50, 4);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xdd2222, // 大红色
      roughness: 0.9,
      metalness: 0,
    });

    const redRoad = new THREE.Mesh(roadGeo, roadMat);

    // // 放平到地面
    //         redRoad.rotation.x = -Math.PI / 2;
    //         redRoad.position.set(0, 0.01, 0); // y稍微抬高一点，防止地面闪烁Z‑fighting

    // 阴影优化（防卡顿）
    redRoad.receiveShadow = true;
    redRoad.castShadow = false;

    await this.app.shaderManager.warmup({ mesh: redRoad });

    const sliceId = addEntity(this.app.ecs.world);
    addComponent(this.app.ecs.world, Transform, sliceId);
    addComponent(this.app.ecs.world, CubeRenderer, sliceId);
    addComponent(this.app.ecs.world, Color, sliceId);
    addComponent(this.app.ecs.world, PrimitiveMesh, sliceId);

    markDirty(this.app.ecs.world, sliceId, DIRTY_TRANSFORM);

    Transform.x[sliceId] = -25;
    Transform.y[sliceId] = 0.01;
    Transform.z[sliceId] = 0;
    Transform.scaleX[sliceId] = 1;
    Transform.scaleY[sliceId] = 1;
    Transform.scaleZ[sliceId] = 1;
    Transform.rotX[sliceId] = -Math.PI / 2;

    this.app.ecs.entityMeshMap.set(sliceId, redRoad);
    // this.app.scene.add(redRoad)

    // this.app.tileManager.addObjectToTile({
    //     eid:sliceId,worldPos: new THREE.Vector3(Transform.x[sliceId],Transform.y[sliceId],Transform.z[sliceId])
    // })
    this.app.distanceObjectManager.addObject({
      eid: sliceId,
      mesh: redRoad,
      isUpdate: true,
      debug: true,
      getTransform() {
        return {
          x: Transform.x[sliceId],
          y: Transform.y[sliceId],
          z: Transform.z[sliceId],
          scaleX: Transform.scaleX[sliceId],
          scaleY: Transform.scaleY[sliceId],
          scaleZ: Transform.scaleZ[sliceId],
          rotX: Transform.rotX[sliceId],
          rotY: Transform.rotY[sliceId],
          rotZ: Transform.rotZ[sliceId],
        };
      },
    });

    // this.app.distanceObjectManager.updateObjectAABB({
    //     eid:sliceId,mesh:redRoad,
    // })

    // console.log(sliceId,'sliceId')
  }

  destroy() {
    const { world } = this.app.ecs;
    const entities = CubeRenderQuery(world);
    for (const eid of entities) {
      const mesh = this.app.ecs.entityMeshMap.get(eid);
      if (mesh) disposeObject(mesh);
      this.app.ecs.destroyEntity(eid);
    }
  }
}
