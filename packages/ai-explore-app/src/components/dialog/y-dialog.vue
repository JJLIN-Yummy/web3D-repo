<template>
  <DialogRoot v-model:open="props.show">
    <!-- 删掉 DialogTrigger！我们用代码控制 -->
    <DialogPortal>
      <DialogOverlay class="DialogOverlay" />
      <DialogContent class="DialogContent flex flex-col">
        <DialogTitle>{{ $props.title }}</DialogTitle>
        <DialogDescription class="my-1 break-all">{{
          $props.content
        }}</DialogDescription>
        <div class="self-end">
          <DialogClose as-child class="mr-1">
            <y-button @click="handleCancelBuy">取消</y-button>
          </DialogClose>
          <DialogClose as-child>
            <y-button danger>查看</y-button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
// import {
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogOverlay,
//   DialogPortal,
//   DialogRoot,
//   DialogTitle,
// } from 'reka-ui'
import type { dialogProps } from "@/components/dialog/type";
import YButton from "@/components/button/y-button.vue";

const props = withDefaults(defineProps<dialogProps>(), {
  show: false,
});
const emit = defineEmits<{
  (e: "update:show", show: boolean): void;
  (e: "cancel:buy"): void;
}>();

const handleCancelBuy = () => {
  emit("update:show", false);
  emit("cancel:buy");
};
</script>

<style scoped>
.DialogOverlay {
  background-color: rgb(0 0 0 / 50%);
  position: fixed;
  inset: 0;
  z-index: 999;
}

.DialogContent {
  background: rgb(18 22 30 / 94%);
  border: 1px solid rgb(110 170 230 / 24%);
  border-radius: 14px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 500px;
  padding: 20px;
  color: #dce6f1;
  z-index: 1000;
}
</style>
