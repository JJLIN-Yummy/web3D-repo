<template>
  <div class="login-wrap">
    <div class="login-box">
      <h2 class="login-title">登录</h2>
      <form
        @submit.prevent="handleLogin"
        class="login-form"
        @keydown.enter="handleLogin"
      >
        <div class="form-item">
          <input
            v-model="phone"
            type="tel"
            placeholder="请输入手机号"
            class="form-input"
            maxlength="11"
          />
          <div v-if="errorMsg.phone" class="tip">{{ errorMsg.phone }}</div>
        </div>
        <div class="form-item">
          <input
            v-model="password"
            :type="pwdShow ? 'text' : 'password'"
            placeholder="请输入密码"
            class="form-input"
          />
          <button type="button" class="eye-btn" @click="pwdShow = !pwdShow">
            {{ pwdShow ? "隐藏" : "显示" }}
          </button>
          <div v-if="errorMsg.password" class="tip">
            {{ errorMsg.password }}
          </div>
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { useUser } from "@/store/modules/userStore";
import type { loginResponseType } from "@/api/apiUser";

const emit = defineEmits<{
  (e: "success", data: loginResponseType): void;
  (e: "error"): void;
}>();

const phone = ref("");
const password = ref("");
const pwdShow = ref(false);
const loading = ref(false);

const userStore = useUser();

const errorMsg = reactive({
  phone: "",
  password: "",
});

// 简单校验
function validate() {
  let pass = true;
  const regPhone = /^1[3-9]\d{9}$/;
  errorMsg.phone = "";
  errorMsg.password = "";

  if (!phone.value) {
    errorMsg.phone = "请输入手机号";
    pass = false;
  } else if (!regPhone.test(phone.value)) {
    errorMsg.phone = "手机号格式错误";
    pass = false;
  }

  if (!password.value) {
    errorMsg.password = "请输入密码";
    pass = false;
  } else if (password.value.length < 6) {
    errorMsg.password = "密码至少6位";
    pass = false;
  }
  return pass;
}

async function handleLogin() {
  if (!validate()) return;
  loading.value = true;

  try {
    const res = await userStore.login({
      userPhone: "19120595267",
      userPassword: "123456",
    });
    if (!res) {
      alert("登录失败");
      emit("error");
    } else {
      emit("success", res);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef6ff, #f0f4f9);
  margin: 0;
}

.login-box {
  width: 360px;
  padding: 40px 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 8%);
}

.login-title {
  text-align: center;
  color: #222;
  font-size: 24px;
  margin: 0 0 32px;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  position: relative;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #4096ff;
}

.eye-btn {
  position: absolute;
  right: 12px;
  top: 14px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  font-size: 14px;
}

.tip {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}

.login-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background-color: #4096ff;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:disabled {
  background-color: #94bfff;
  cursor: not-allowed;
}

.login-btn:hover:not(:disabled) {
  background-color: #337fdd;
}
</style>
