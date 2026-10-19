# 镜像只用来运行代码，不再编译！
FROM node:20-alpine
WORKDIR /app

# 拷贝子包的package.json，只安装生产依赖
COPY server/staticServer/package.json ./
RUN npm install -g pnpm && pnpm install --prod

# 拷贝编译好的dist产物（dist是jenkins宿主机tsup打包出来的）
COPY server/staticServer/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
