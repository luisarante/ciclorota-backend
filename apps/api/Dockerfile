FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS build
COPY apps/api apps/api
COPY packages/shared packages/shared

RUN npm run build --workspace @ciclorota/api

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 3333

CMD ["node", "apps/api/dist/server.js"]
