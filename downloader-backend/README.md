# ZeeKay downloader backend

This directory provides the Docker API used by `/downloader.html`.

Render setup:

- Type: Web Service
- Public repository: `https://github.com/zeekayeditz1/zeekayeditz.com`
- Branch: `main`
- Root directory: `downloader-backend`
- Runtime: Docker
- Instance: Free
- Health check: `/health`
- Environment: `ALLOWED_ORIGINS=https://zeekayeditz.com,https://www.zeekayeditz.com`
- No payment method, persistent disk, or paid add-on is needed.

Test `/api/info`, a complete download, and the resulting audio/video before
changing the website's `BACKEND_URL`. A successful health check alone does
not prove that the host can access YouTube.

YouTube sessions, if needed, must be configured as private host secrets.
Never commit cookies or credentials. The free plan has bandwidth and idle
limits; temporary downloads disappear when the service restarts.
