### Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --silent
COPY frontend /app
RUN npm run build

### Production stage (nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Enable SPA routing (serve index.html)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
