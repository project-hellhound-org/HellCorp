FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false --legacy-peer-deps
COPY . .
RUN mkdir -p logs uploads
EXPOSE 3000
CMD ["node", "server/app.js"]
