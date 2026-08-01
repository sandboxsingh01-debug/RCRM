FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p database
EXPOSE 5000
CMD ["sh", "-c", "node src/config/seed.js && node src/server.js"]
