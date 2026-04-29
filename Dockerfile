# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Déclaration des arguments de build pour Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run requirement: Listen on port defined by PORT environment variable, defaults to 8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
