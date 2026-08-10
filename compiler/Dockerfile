FROM node:20-bookworm-slim

WORKDIR /app

# Install all compiler/interpreter runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jdk \
    python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY server.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

# Start the simple compiler server
CMD ["node", "server.js"]
