# Use the official Bun image
FROM oven/bun:1-slim AS build

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb tsconfig.json vite.config.ts ./

# Install dependencies
RUN bun install

# Copy the rest of the source code
COPY ./src ./src

# Run Vite build
RUN bun run build

# Use Bun image for production
FROM oven/bun:1-slim AS production

# Set the working directory
WORKDIR /app

# Copy the built files from the build stage
COPY --from=build /app/dist ./dist

# Copy node_modules to production image (optional for runtime dependencies)
COPY --from=build /app/node_modules ./node_modules

# Copy package.json for running scripts if needed
COPY package.json ./

# Expose the application port
EXPOSE 8888

# Set the command to run your application
CMD ["bun", "./dist/app.js"]
