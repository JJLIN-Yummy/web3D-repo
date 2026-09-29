import "@/styles/tailwind.css";

import { createApp } from "vue";
import App from "./App.vue";
import { setupStore } from "@/store";

const app = createApp(App);
setupStore(app);
app.mount("#app");
