FROM node:20-alpine
WORKDIR /app

# 上下文是仓库根目录，所以路径写完整
COPY server/staticServer/package.json ./
RUN npm install -g pnpm && pnpm install --prod

# 拷贝jenkins宿主机编译好的dist目录
COPY server/staticServer/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
