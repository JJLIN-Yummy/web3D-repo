<template>
  <ProgressRoot
    v-model="$props.value"
    class="ProgressRoot"
    style="transform: translateZ(0)"
  >
    <ProgressIndicator
      class="ProgressIndicator duration-1000"
      :style="`transform: translateX(-${100 - percent}%)`"
    />
  </ProgressRoot>
</template>

<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import type { progressProps } from "@/components/progress/type";
import { throwTypeError } from "@common/tools";

const props = withDefaults(defineProps<progressProps>(), {
  value: 0,
  total: 1,
});

const emit = defineEmits<{
  (e: "end"): void;
}>();

// 组件初始化 + props变化自动校验total>0
watch(
  () => props.total,
  (total) => {
    if (total <= 0) {
      throw throwTypeError("total", total, "[Progress] prop total 必须大于0");
    }
  },
  { immediate: true }
);

// 计算百分比，这里顺便做保护，防止total为0除零报错
const percent = computed(() => {
  const safeTotal = Math.max(props.total, 1);
  return Math.min(Math.max((props.value / safeTotal) * 100, 0), 100);
});

watch(
  () => percent.value,
  () => {
    if (percent.value === 100) {
      emit("end");
    }
  }
);
</script>

<style scoped>
/* 进度条外层容器 */
.ProgressRoot {
  height: 16px;
  width: 300px;
  border-radius: 9999px;
  position: relative;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid;
  transform: translateZ(0);
}

.dark .ProgressRoot {
  background-color: #0c0a09;
}

/* 进度填充指示器 */
.ProgressIndicator {
  border-radius: 9999px;
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #84cc16; /* grass9 */
  overflow: hidden;
  transition: transform 660ms cubic-bezier(0.65, 0, 0.35, 1);
}

/* 斜纹伪元素 */
.ProgressIndicator::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    -45deg,
    rgb(255 255 255 / 20%) 25%,
    transparent 25%,
    transparent 50%,
    rgb(255 255 255 / 20%) 50%,
    rgb(255 255 255 / 20%) 75%,
    transparent 75%,
    transparent
  );
  background-size: 30px 30px;
  animation: progress-stripe 1s linear infinite;
}

/* 条纹滚动动画 */
@keyframes progress-stripe {
  0% {
    background-position: 0 0;
  }

  100% {
    background-position: 60px 0;
  }
}
</style>
