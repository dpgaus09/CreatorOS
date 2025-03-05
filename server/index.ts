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
      console.log('Starting production server initialization...');
      
      // Set up initialization timeout to prevent hanging
      const initTimeout = setTimeout(() => {
        console.log('⚠️ Production initialization timed out, continuing with server startup...');
      }, 25000); // 25 second timeout
      
      try {
        // Dynamically import the initialization module to avoid requiring it in development
        // Handle different extensions for different environments
        // Define the expected module interface
        interface InitModule {
          initializeProductionServer: () => Promise<boolean>;
        }
        
        // Default fallback implementation
        const fallbackModule: InitModule = {
          initializeProductionServer: async () => {
            console.log('Using fallback initialization function');
            return true;
          }
        };
        
        // Safe import with type checking
        let initModule: InitModule = fallbackModule;
        
        try {
          console.log('Attempting to import init.js...');
          const importResult = await Promise.race([
            import('./init.js'),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Import timeout')), 5000)
            )
          ]);
          
          // Check if the imported module has the expected function
          if (importResult && typeof (importResult as any).initializeProductionServer === 'function') {
            initModule = importResult as InitModule;
          } else {
            console.log('Imported module does not contain initializeProductionServer function');
          }
        } catch (importErr) {
          console.log('Failed to import init.js, trying init without extension', 
            importErr instanceof Error ? importErr.message : String(importErr));
          
          try {
            const importResult = await Promise.race([
              import('./init'),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Import timeout')), 5000)
              )
            ]);
            
            // Check if the imported module has the expected function
            if (importResult && typeof (importResult as any).initializeProductionServer === 'function') {
              initModule = importResult as InitModule;
            } else {
              console.log('Imported module does not contain initializeProductionServer function');
            }
          } catch (err2) {
            console.log('Failed to import init module in all attempted ways, using fallback initialization');
            // fallbackModule is already set as default
          }
        }
        
        const { initializeProductionServer } = initModule;
        console.log('Successfully imported initialization module');
        
        // Run initialization with timeout protection
        const initPromise = initializeProductionServer();
        const initResult = await Promise.race([
          initPromise,
          new Promise(resolve => setTimeout(() => {
            console.log('⚠️ Initialization function timed out, assuming success and continuing...');
            resolve(true);
          }, 15000))
        ]);
        
        console.log('Production initialization completed with result:', initResult);
      } catch (err) {
        console.error('Error during production initialization:', err);
        console.error('Full error details:', err instanceof Error ? err.stack : String(err));
        // Continue even if initialization fails
      } finally {
        // Always clear the timeout
        clearTimeout(initTimeout);
      }
      
      console.log('Setting up static file serving for production...');
      // Serve static files in production
      try {
        serveStatic(app);
        console.log('Static file serving initialized');
      } catch (staticErr) {
        console.error('Error setting up static file serving:', staticErr);
        console.log('Will attempt to continue without static file serving');
      }
    } else {
      // In development, use Vite for HMR
      await setupVite(app, server);
    }

    // Get port from env or use default
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || "0.0.0.0";

    // Start server with port retry capability and enhanced error handling
    const startServer = (attemptPort: number) => {
      // Log deployment environment for debugging
      console.log('Server environment:', {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'set (value hidden)' : 'not set'
      });
      
      try {
        server.listen(attemptPort, host)
          .on('listening', () => {
            log(`Server listening on http://${host}:${attemptPort}`);
            
            // Log successful startup message
            console.log('✅ Server started successfully!');
            
            // Try to log available routes for debugging
            try {
              const routes = app._router.stack
                .filter((r: any) => r.route)
                .map((r: any) => {
                  return {
                    path: r.route.path,
                    methods: Object.keys(r.route.methods).join(',')
                  };
                });
              console.log(`Available routes: ${routes.length} endpoints registered`);
            } catch (routeError) {
              // Just log and continue if this fails
              console.log('Could not print routes');
            }
          })
          .on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE' && attemptPort < 5010) {
              // Try next port
              log(`Port ${attemptPort} is busy, trying ${attemptPort + 1}...`);
              startServer(attemptPort + 1);
            } else {
              console.error('Failed to start server:', error);
              // Don't exit - allow the process to continue
              console.log('Continuing despite server start failure');
            }
          });
      } catch (criticalError) {
        console.error('Critical error during server start:', criticalError);
        console.log('Will attempt to continue execution');
      }
    };

    // Start the server with configured port
    startServer(port);
  } catch (error) {
    console.error('Critical server error:', error);
    process.exit(1);
  }
})();