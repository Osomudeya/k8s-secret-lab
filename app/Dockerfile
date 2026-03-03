# Sample app for K8s Secrets Lab — runs in-cluster and reads secrets from env/volume
FROM node:18-alpine

WORKDIR /app

COPY server.js ./

EXPOSE 3000

USER node

CMD ["node", "server.js"]
