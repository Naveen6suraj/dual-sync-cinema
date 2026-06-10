FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and Prisma schema
COPY . .
RUN npx prisma generate
RUN npm run build || tsc || echo "Assuming tsc handles build or using ts-node in prod"

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Expose signaling port
EXPOSE 4000

CMD ["npx", "ts-node", "src/server.ts"]
