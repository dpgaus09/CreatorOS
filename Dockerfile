# Build stage
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Install necessary build tools
RUN apk add --no-cache python3 make g++ curl 

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Check if build succeeded
RUN ls -la dist/ && \
    echo "Build contents:" && \
    ls -la dist/public/

# Production stage
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install production tools
RUN apk add --no-cache curl wget

# Create uploads directory if it doesn't exist
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy build outputs from build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist/public /app/server/public

# Make sure critical directories exist
RUN mkdir -p /app/server/public /app/uploads

# Copy deployment scripts
COPY deploy-scripts /app/deploy-scripts

# Make script executable
RUN chmod +x /app/deploy-scripts/start.sh

# Expose the port the app runs on
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/ || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV DEBUG=express:*

# Command to run the application
CMD ["/app/deploy-scripts/start.sh"]