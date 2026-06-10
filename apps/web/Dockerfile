FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for modern package managers if needed
# RUN corepack enable

COPY package*.json ./
RUN npm install

COPY . .

# Environment variables must be present for Next.js build
ENV NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
