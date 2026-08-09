# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder — install deps & build Next.js
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps needed for build)
RUN npm ci

# Copy the full source
COPY . .

# Build Next.js production bundle
# Set dummy env vars so build doesn't fail on missing secrets
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runner — lean production image WITH compiler runtimes
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# ── Install all compiler/interpreter runtimes ──────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # C / C++ compilers
    gcc \
    g++ \
    # Java 21 JDK (compile + run)
    default-jdk \
    # Python 3
    python3 \
    python3-pip \
    # Make python3 available as "python"
    && ln -sf /usr/bin/python3 /usr/bin/python \
    # Cleanup apt cache to keep image small
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Verify runtimes are available ─────────────────────────────────────────
RUN echo "=== Runtime versions ===" \
    && python3 --version \
    && java -version \
    && javac -version \
    && gcc --version | head -1 \
    && g++ --version | head -1 \
    && node --version \
    && echo "=== All runtimes OK ==="

# ── Create non-root user for security ─────────────────────────────────────
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# ── Copy built Next.js app from builder ───────────────────────────────────
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ── Copy Monaco editor static assets (needed at runtime) ─────────────────
COPY --from=builder /app/public/monaco-editor ./public/monaco-editor

# ── Set environment ───────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Ensure code execution uses /tmp for temp files (writable in all environments)
ENV TMPDIR=/tmp

USER nextjs

EXPOSE 3000

# Start the Next.js standalone server
CMD ["node", "server.js"]
