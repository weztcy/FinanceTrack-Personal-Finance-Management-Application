FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci

FROM dependencies AS web-build
COPY frontend frontend
RUN npm run build -w frontend

FROM node:24-alpine AS backend
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev --workspace=backend --include-workspace-root=false && npm cache clean --force
COPY --chown=node:node backend backend
RUN mkdir -p /app/backend/data && chown -R node:node /app/backend/data
WORKDIR /app/backend
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 DATABASE_PATH=/app/backend/data/financetrack.sqlite
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.js"]

FROM nginx:1.28-alpine AS frontend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
