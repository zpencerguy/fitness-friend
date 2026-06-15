FROM node:22-alpine

WORKDIR /app

COPY apps/api/package.json ./package.json
COPY apps/api/src ./src
COPY apps/api/openapi.yaml ./openapi.yaml

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
