# 构建阶段 builder：tsup编译后端TS代码
FROM node:20-alpine AS builder
WORKDIR /app

# monorepo 拷贝依赖清单，利用docker缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/staticServer/package.json ./server/staticServer/

# ✅ 使用包名 @web3d/static-server，带上...拉取内部依赖
RUN npm install -g pnpm && pnpm install --filter @web3d/static-server...

# 拷贝全部源码
COPY . .

# ✅ 和你项目脚本保持一致，用包名执行build
RUN pnpm -F @web3d/static-server build

# 生产运行镜像
FROM node:20-alpine
WORKDIR /app

# 只复制编译产物和package.json
COPY --from=builder /app/server/staticServer/dist ./dist
COPY --from=builder /app/server/staticServer/package.json ./

# 生产镜像只安装当前包生产依赖
RUN npm install -g pnpm && pnpm install --prod

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
