<template>
  <div class="page">
    <ThreeCanvas ref="canvas" />
    <div class="chat">
      <input
        v-model="text"
        @keyup.enter="send"
        placeholder="输入指令：例如 在前方生成红色方块"
      />
    </div>
    <div id="crosshair">+</div>
  </div>
  <div
    class="loading-page fixed z-[999] w-[100vw] h-[100vh] top-0 bg-amber-300"
    v-if="showLoadingPageRef"
  >
    <y-hv-absolute-center>
      <y-progress
        :value="resolvedCount"
        :total="total"
        @end="onProgressEnd"
      ></y-progress>
      <y-hv-absolute-center class="text-[12px]">
        {{ resolvedCount }} / {{ total }}
      </y-hv-absolute-center>
    </y-hv-absolute-center>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ThreeCanvas from "./components/ThreeCanvas.vue";
import { resourceQueue, resourceQueueEventName } from "./global/resourceQueue";
import { resourceQueueStatusEnum } from "@/global/resourceQueue/enum";
import YHvAbsoluteCenter from "@/components/layout/center/y-hv-absolute-center.vue";
import { resourceQueueName } from "@/enums";

const canvas = ref<InstanceType<typeof ThreeCanvas>>();
const text = ref("");
let id = new Date().getTime() + "";

const showLoadingPageRef = ref(true);

console.log(import.meta.env);

/**
 * 发送自然语言指令，请求后端AI解析为结构化Action
 */
async function send() {
  if (!text.value.trim()) return;
  // const actionData = await sendAiPrompt(text.value)
  canvas.value?.execAction(text.value, id);
  text.value = "";
}

//============统计资源加载==============
const resolvedCount = ref(0);
const total = ref(1);

//实时计算任务数
resourceQueue.on(resourceQueueEventName.addTask, () => {
  total.value =
    resourceQueue.getTasksByStatus(resourceQueueName.common)?.count ?? 0;
  if (!total.value) {
    total.value = 1;
    resolvedCount.value = 1;
  }
});

resourceQueue.on(resourceQueueEventName.resolved, () => {
  resolvedCount.value =
    resourceQueue.getTasksByStatus(
      resourceQueueName.common,
      resourceQueueStatusEnum.resolved
    )?.count ?? 0;
});

//================事件=============
const onProgressEnd = () => {
  setTimeout(() => {
    showLoadingPageRef.value = false;
  }, 1000);
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.page {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.chat {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
}

input {
  width: 500px;
  padding: 12px 16px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  outline: none;
}

#crosshair {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 26px;

  /* 核心属性：不会拦截鼠标点击事件 */
  pointer-events: none;
  z-index: 100;
  user-select: none;
}
</style>
