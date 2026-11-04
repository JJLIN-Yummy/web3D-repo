import type { requestType, responseType } from "@common/request";

import { httpClient } from "@common/request";
import { getEnv } from "@/utils/env";
import { RequestEnum } from "@/enums";
import { useUser } from "@/store/modules/userStore";

const { RequestFactoryWrapper } = httpClient({
  apiUrl: getEnv().front_monitor_url,
});

export type reportType = {
  projectId: string;
  env: string;
  errorType: string;
  errorMsg: string;
  stack: string;
  pageUrl: string;
  routePath: string;
  userIdentify: string;
  browser: string;
  os: string;
  device: string;
  projectVersion: string;
  sdkType: string;
  fingerprint: string;
  fingerprintType: string;
  level: string;
};

export const post_report = RequestFactoryWrapper<
  requestType<EmptyObj, EmptyObj, reportType>,
  responseType<EmptyObj>
>({ id: 6 }).collectData(
  ({ data }) => {
    const userStore = useUser();
    return {
      url: "/monitor/report",
      method: RequestEnum.POST,
      data,
      headers: {
        // 'X-Real-IP': '127.0.0.1',
        Authorization: "Bearer " + userStore.token,
      },
    };
  },
  {
    withToken: false,
  }
);
