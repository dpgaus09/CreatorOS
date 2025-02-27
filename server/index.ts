import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    let port = 5000;
    const host = "0.0.0.0";

    const startServer = (attemptPort: number) => {
      server.listen(attemptPort, host)
        .on('listening', () => {
          port = attemptPort;
          log(`Server listening on http://${host}:${port}`);
        })
        .on('error', (error: any) => {
          if (error.code === 'EADDRINUSE' && attemptPort < 5010) {
            // Try next port
            log(`Port ${attemptPort} is busy, trying ${attemptPort + 1}...`);
            startServer(attemptPort + 1);
          } else {
            console.error('Failed to start server:', error);
            process.exit(1);
          }
        });
    };

    startServer(port);
  } catch (error) {
    console.error('Critical server error:', error);
    process.exit(1);
  }
})();