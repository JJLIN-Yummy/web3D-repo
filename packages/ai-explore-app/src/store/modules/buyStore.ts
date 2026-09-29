import { defineStore } from "pinia";
import { ref } from "vue";
import { store } from "@/store";
import { exitPointerLock } from "@/global";

export const useBuyStore = defineStore("buy", () => {
  // 其他配置...
  const showDetailsRef = ref(false);
  const titleRef = ref("");
  const contentRef = ref("");
  return {
    showDetailsRef,
    titleRef,
    contentRef,
    updateShowDetail(v: boolean) {
      showDetailsRef.value = v;
      if (v) {
        exitPointerLock();
      }
    },
    updateTitle(v: string) {
      titleRef.value = v;
    },
    updateContent(v: string) {
      contentRef.value = v;
    },
  };
});

// Need to be used outside the setup
export function useBuy() {
  return useBuyStore(store);
}
