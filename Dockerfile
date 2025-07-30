# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build client (Vite) and server (if needed)
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose the port your server runs on (5000)
EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"] 