FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server-firestore.js"]
