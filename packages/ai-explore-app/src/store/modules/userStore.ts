import { defineStore } from "pinia";
import { type loginType, post_login } from "@/api/apiUser";
import { store } from "@/store";
import { ref } from "vue";
import { ResponseField } from "@/enums";

export const useUserStore = defineStore("user", () => {
  const token = ref("");
  const phone = ref("");
  const id = ref("");

  const login = async (data: loginType) => {
    return post_login({ data })
      .response()
      .then((res) => {
        const { data } = res;
        if (data && data[ResponseField.CODE] === 200) {
          token.value = data[ResponseField.DATA].token;
          id.value = data[ResponseField.DATA].id;
          return data[ResponseField.DATA];
        }
      });
  };
  return {
    token,
    phone,
    login,
  };
});

// Need to be used outside the setup
export function useUser() {
  return useUserStore(store);
}
