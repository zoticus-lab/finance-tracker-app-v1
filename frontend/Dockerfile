FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy application files
COPY . .

# Copy .env if exists or create from example
RUN if [ -f .env.example ]; then cp .env.example .env; fi

# Build the application
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose port
EXPOSE 5175

# Start the application
CMD ["serve", "-s", "dist", "-l", "5175"]
