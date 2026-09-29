<template>
  <div
    ref="container"
    style="width: 100%; height: 100vh; overflow: hidden"
  ></div>

  <y-dialog
    v-model:show="buyStore.showDetailsRef"
    :title="buyStore.titleRef"
    :content="buyStore.contentRef"
    @cancel:buy="onCancelBuy"
  ></y-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  ActionSystem,
  activeClickId,
  entityMsgMap,
  ThreeApp,
  World,
} from "@/index";
import yDialog from "@/components/dialog/y-dialog.vue";
import { useBuyStore } from "@/store/modules/buyStore";
import { FunctionEntity } from "@/ecs/function/functionEntity";
import { FunctionComponent } from "@/ecs/function/functionComponent";
import { mousedownEntity } from "@/global/event/mousedown";
import { resourceQueue, resourceQueueEventName } from "@/global/resourceQueue";
import { resourceQueueName } from "@/enums";
import { getEnv, getStaticResourceUrl } from "@/utils/env";

const buyStore = useBuyStore();

getEnv();

const container = ref<HTMLElement>();
let app: ThreeApp | null = null;
let world: typeof World | null = null;
let actionSystem: typeof ActionSystem | null = null;

function fullDispose() {
  // 先清空ECS所有动态方块
  if (world) world.destroy();
  // 销毁3D渲染上下文，释放显存
  if (app) app.destroy();
  // 清空引用，GC回收
  app = null;
  world = null;
  actionSystem = null;
}

//=========================events=====================
const pointerLockComponent = new FunctionComponent({
  cb() {
    container.value && container.value.requestPointerLock();
  },
});

const cancelBuyFunctionEntity = new FunctionEntity({
  components: [pointerLockComponent],
});

const onCancelBuy = () => {
  cancelBuyFunctionEntity.run();
};

mousedownEntity.addComponent(
  new FunctionComponent({
    cb() {
      app.hoverSystem();
    },
  })
);

// 对外暴露指令执行方法，上层AI聊天面板调用
defineExpose({
  execAction: (prompt: string, sessionId: string) =>
    app.generateAIModelByText(prompt, sessionId),
});

onMounted(async () => {
  if (!container.value) return;
  // 1. 创建底层3D应用（唯一new ECSWorld的地方）
  app = new ThreeApp({
    container: container.value,
    hdrPath: getStaticResourceUrl("/textures/hdr/sky/sky.hdr"),
    exposure: 0.7,
    fov: 65,
    playerHeight: 2.0,
    enableShadow: true,
    event: {
      onHoverChange() {
        if (!buyStore.showDetailsRef) {
          buyStore.updateShowDetail(true);

          const msg = entityMsgMap.get(activeClickId);
          buyStore.updateTitle(msg.title);
          buyStore.updateContent(msg.content);
        }
      },
    },
  });
  // 2. 静态场景管理器，依赖注入app
  world = new World(app);
  // 3. AI指令系统，直接传入app，复用app内ecs实例
  // actionSystem = new ActionSystem(app)
  // 初始化地面、灯光、辅助线
  world.init();
  // 先启动渲染循环
  // setTimeout(()=>{
  //   app.start()
  //
  // },10000)

  resourceQueue.on(resourceQueueEventName.fulfilled, ({ type }) => {
    if (type === resourceQueueName.common) {
      app.start();
    }
  });

  setTimeout(() => {
    resourceQueue.runTask(resourceQueueName.common);
  }, 1000);
  // await app.actionSystem.initDefaultCubes()

  window.addEventListener("beforeunload", fullDispose);
});

onUnmounted(() => {
  fullDispose();
});
</script>
