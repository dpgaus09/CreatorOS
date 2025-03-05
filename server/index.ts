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
    // Register all routes
    const server = await registerRoutes(app);

    // Add global error handler with improved typing
    interface ServerError extends Error {
      status?: number;
      statusCode?: number;
    }
    
    app.use((err: ServerError, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Check for environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, initialize the analytics services and data
    if (isProduction) {
      try {
        // Dynamically import the initialization module to avoid requiring it in development
        const { initializeProductionServer } = await import('./init.js');
        await initializeProductionServer();
      } catch (err) {
        console.error('Error during production initialization:', err);
        // Continue even if initialization fails
      }
      
      // Serve static files in production
      serveStatic(app);
    } else {
      // In development, use Vite for HMR
      await setupVite(app, server);
    }

    // Get port from env or use default
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || "0.0.0.0";

    // Start server with port retry capability
    const startServer = (attemptPort: number) => {
      server.listen(attemptPort, host)
        .on('listening', () => {
          log(`Server listening on http://${host}:${attemptPort}`);
        })
        .on('error', (error: NodeJS.ErrnoException) => {
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

    // Start the server with configured port
    startServer(port);
  } catch (error) {
    console.error('Critical server error:', error);
    process.exit(1);
  }
})();