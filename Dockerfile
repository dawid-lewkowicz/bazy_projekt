FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Instalujemy openssl w systemie budującym na wszelki wypadek
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma

# Instalujemy czyste zależności
RUN npm install

COPY . .

# KROK RATUNKOWY: Czyścimy stary, zbuforowany klient z Windowsa i generujemy nowy pod Debiana
RUN rm -rf node_modules/.prisma/client
RUN npx prisma generate

FROM node:22-bookworm-slim
WORKDIR /app

# Instalujemy openssl w obrazie produkcyjnym
RUN apt-get update -y && apt-get install -y openssl

COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "start"]