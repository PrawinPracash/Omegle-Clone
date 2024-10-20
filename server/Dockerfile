FROM node:16.17-alpine
WORKDIR /app
COPY . .
RUN npm i
RUN npm run build
EXPOSE 8000
CMD [ "node", "build/index.js" ]