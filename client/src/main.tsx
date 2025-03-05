import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadCriticalRoutes } from "./preload";

// Mark the beginning of application load
const APP_START_TIME = performance.now();

// Preload critical resources right away
preloadCriticalRoutes();

// Initialize app with performance tracking
const initApp = () => {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Failed to find root element");
  }

  // Create root with error boundary
  const root = createRoot(container);
  
  // Render the application
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Log application load time for performance monitoring
  window.addEventListener('load', () => {
    const loadTime = performance.now() - APP_START_TIME;
    console.log(`Application initialized in ${loadTime.toFixed(2)}ms`);
    
    // Hide loading spinner once app is loaded
    document.body.classList.add('app-loaded');
    
    // Report performance metrics
    if ('PerformanceObserver' in window) {
      // Track LCP (Largest Contentful Paint) for user experience metrics
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Track FID (First Input Delay) for interactivity metrics
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          const delay = entry.processingStart - entry.startTime;
          console.log(`FID: ${delay.toFixed(2)}ms`);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }
  });
};

// Start application initialization
initApp();