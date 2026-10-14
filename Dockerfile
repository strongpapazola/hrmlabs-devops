FROM node:24-alpine

ENV NODE_ENV=production PORT=3000
WORKDIR /app

COPY --chown=node:node application/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node application/src ./src

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz', {signal: AbortSignal.timeout(2000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
