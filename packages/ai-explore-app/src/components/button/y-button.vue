<template>
  <button
    class="ui-btn"
    :class="{
      'is-primary': primary,
      'is-danger': danger,
      'is-secondary': secondary,
    }"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  primary?: boolean;
  danger?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}>();

const _emit = defineEmits<{
  (e: "click"): void;
}>();
</script>

<style scoped>
.ui-btn {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid rgb(255 255 255 / 20%);
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgb(255 255 255 / 12%);
  color: #fff;
}

.ui-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ui-btn:hover:not(:disabled) {
  background-color: rgb(255 255 255 / 22%);
}

/* 主按钮‑蓝色 确认 */
.ui-btn.is-primary {
  background-color: #2563eb;
  border-color: #2563eb;
  color: white;
}

.ui-btn.is-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

/* 危险‑红色 购买 */
.ui-btn.is-danger {
  background-color: #dc2626;
  border-color: #dc2626;
  color: white;
}

.ui-btn.is-danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

/* 次要按钮‑透明 取消（默认就是次要） */
.ui-btn.is-secondary {
  background-color: rgb(255 255 255 / 12%);
  color: #fff;
}
</style>
