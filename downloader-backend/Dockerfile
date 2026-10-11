FROM node:24-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp_linux = truly standalone binary, NO Python needed
ARG YTDLP_VERSION=2026.08.19
RUN curl -fL --retry 3 https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify both work at build time
RUN yt-dlp --version && ffmpeg -version | head -1

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js .

ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860
CMD ["node", "server.js"]

