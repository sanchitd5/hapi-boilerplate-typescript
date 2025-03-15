FROM node:18-alpine

# Install dependencies
RUN apt add --no-cache python3 make g++ git

# Install PM2 globally
RUN npm install -g pm2 pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Start with PM2 in production mode
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
