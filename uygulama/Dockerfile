FROM node:22-alpine

RUN apk add --no-cache tzdata
ENV TZ=Europe/Istanbul \
    NODE_ENV=production \
    PORT=8000

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

EXPOSE 8000
USER node
CMD ["node", "src/server.js"]
