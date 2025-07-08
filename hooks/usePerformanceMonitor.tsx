import { useEffect, useState } from "react";

interface PerformanceMetrics {
  loadTime: number;
  isSlowConnection: boolean;
  retryCount: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    isSlowConnection: false,
    retryCount: 0,
  });

  useEffect(() => {
    const startTime = performance.now();

    // Check connection speed
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    const isSlowConnection =
      connection &&
      (connection.downlink < 1 ||
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g");

    setMetrics((prev) => ({
      ...prev,
      isSlowConnection: Boolean(isSlowConnection),
      loadTime: performance.now() - startTime,
    }));

    // Monitor for long tasks
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Long task threshold
            console.warn("Long task detected:", entry.duration + "ms");
          }
        }
      });

      try {
        observer.observe({ entryTypes: ["longtask"] });
      } catch (e) {
        // Longtask API not supported
      }

      return () => observer.disconnect();
    }
  }, []);

  const incrementRetryCount = () => {
    setMetrics((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));
  };

  return {
    ...metrics,
    incrementRetryCount,
  };
};

// Retry wrapper for failed requests
export const withRetry = async <T,>(
  asyncFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};
