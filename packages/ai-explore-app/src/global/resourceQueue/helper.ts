import { concurRequests } from "@common/request";

export const taskRunHelper = (max: number) => {
  const { emitter } = concurRequests(max);

  return <T>(cb: (...args: any[]) => Promise<T>) => {
    return async () => {
      return await new Promise((r1) => {
        emitter(async () => {
          return await new Promise((r2) => {
            let t: ReturnType<typeof setTimeout> | null = setTimeout(() => {
              // const f = async function*(){
              //     yield;
              //     const result = await cb();
              //     r2(1);
              //     r1(result);
              //     yield;
              //     t && clearTimeout(t);
              //     t = null;
              // }
              // runTask(f());

              (async () => {
                const result = await cb();
                r2(1);
                r1(result);
                t && clearTimeout(t);
                t = null;
              })();
            }, 1000);
          });
        });
      });
    };
  };
};
