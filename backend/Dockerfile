FROM node:20-alpine

# Patch OS packages in the base layer (e.g. openssl CVE-2026-45447)
RUN apk update && apk upgrade --no-cache

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

USER node

EXPOSE 5000

CMD ["node", "index.js"]
