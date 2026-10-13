FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-impress libreoffice-writer fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL=postgresql://localhost/digital_library npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
