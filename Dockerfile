FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN rm -rf node_modules/.prisma/client
RUN npx prisma generate

FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "start"]