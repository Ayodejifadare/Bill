// Performance monitoring utilities for the Biltip app

interface PerformanceMetrics {
  navigationTime: number;
  componentRenderTime: number;
  memoryUsage?: number;
  bundleSize?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Initialize performance monitoring
  init() {
    this.setupNavigationObserver();
    this.setupMemoryMonitoring();
    this.setupBundleAnalysis();
  }

  // Track navigation performance
  startNavigation(route: string) {
    performance.mark(`nav-${route}-start`);
  }

  endNavigation(route: string) {
    performance.mark(`nav-${route}-end`);
    performance.measure(`nav-${route}`, `nav-${route}-start`, `nav-${route}-end`);
    
    const entries = performance.getEntriesByName(`nav-${route}`);
    if (entries.length > 0) {
      const navigationTime = entries[0].duration;
      this.updateMetrics(route, { navigationTime });
      
      // Log slow navigations
      if (navigationTime > 1000) {
        console.warn(`Slow navigation to ${route}: ${navigationTime.toFixed(2)}ms`);
      }
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    this.updateMetrics(componentName, { componentRenderTime: renderTime });
    
    if (renderTime > 16.67) { // More than one frame at 60fps
      console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // Setup navigation observer
  private setupNavigationObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Page Load Performance:', {
              DOMContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              LoadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              FirstPaint: this.getFirstPaint(),
              FirstContentfulPaint: this.getFirstContentfulPaint(),
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  }

  // Setup memory monitoring
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      setInterval(() => {
        const memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
        
        if (memoryUsage > 50) { // Alert if memory usage exceeds 50MB
          console.warn(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
        }
        
        this.updateMetrics('memory', { memoryUsage });
      }, 30000); // Check every 30 seconds
    }
  }

  // Setup bundle analysis
  private setupBundleAnalysis() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('.js')) {
            const resourceEntry = entry as PerformanceResourceTiming;
            const bundleSize = resourceEntry.transferSize || 0;
            
            if (bundleSize > 500000) { // Alert for bundles larger than 500KB
              console.warn(`Large bundle detected: ${entry.name} (${(bundleSize / 1024).toFixed(2)}KB)`);
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    }
  }

  // Get First Paint timing
  private getFirstPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const firstPaint = entries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  // Get First Contentful Paint timing
  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const firstContentfulPaint = entries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  // Update metrics for a specific key
  private updateMetrics(key: string, metrics: Partial<PerformanceMetrics>) {
    const existing = this.metrics.get(key) || {
      navigationTime: 0,
      componentRenderTime: 0,
    };
    
    this.metrics.set(key, { ...existing, ...metrics });
  }

  // Get all metrics
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  // Get metrics for a specific key
  getMetricsFor(key: string): PerformanceMetrics | undefined {
    return this.metrics.get(key);
  }

  // Generate performance report
  generateReport(): string {
    const report = ['Performance Report', '================'];
    
    for (const [key, metrics] of this.metrics) {
      report.push(`${key}:`);
      report.push(`  Navigation: ${metrics.navigationTime.toFixed(2)}ms`);
      report.push(`  Render: ${metrics.componentRenderTime.toFixed(2)}ms`);
      if (metrics.memoryUsage) {
        report.push(`  Memory: ${metrics.memoryUsage.toFixed(2)}MB`);
      }
      if (metrics.bundleSize) {
        report.push(`  Bundle: ${(metrics.bundleSize / 1024).toFixed(2)}KB`);
      }
      report.push('');
    }
    
    return report.join('\n');
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React hook for component performance tracking
export const useComponentPerformance = (componentName: string) => {
  const startTime = performance.now();
  
  return {
    trackRender: () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      PerformanceMonitor.getInstance().trackComponentRender(componentName, renderTime);
    }
  };
};

// Navigation performance tracking
export const trackNavigation = {
  start: (route: string) => PerformanceMonitor.getInstance().startNavigation(route),
  end: (route: string) => PerformanceMonitor.getInstance().endNavigation(route),
};

// Memory usage utilities
export const getMemoryUsage = (): number => {
  if ('memory' in performance) {
    const memoryInfo = (performance as any).memory;
    return memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
  }
  return 0;
};

// Bundle size analysis
export const analyzeBundleSize = (): Promise<{ totalSize: number; chunks: Array<{ name: string; size: number }> }> => {
  return new Promise((resolve) => {
    const chunks: Array<{ name: string; size: number }> = [];
    let totalSize = 0;
    
    const entries = performance.getEntriesByType('resource');
    
    entries.forEach(entry => {
      if (entry.name.includes('.js')) {
        const resourceEntry = entry as PerformanceResourceTiming;
        const size = resourceEntry.transferSize || 0;
        chunks.push({
          name: entry.name.split('/').pop() || 'unknown',
          size
        });
        totalSize += size;
      }
    });
    
    resolve({ totalSize, chunks });
  });
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  PerformanceMonitor.getInstance().init();
};

// Export the singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance optimization utilities
export const performanceUtils = {
  // Debounce function for expensive operations
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  },

  // Throttle function for frequent events
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },

  // Lazy load images
  lazyLoadImage: (img: HTMLImageElement, src: string) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      });
      observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
  },

  // Preload critical resources
  preloadResource: (href: string, as: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  // Check if device has limited resources
  isLowEndDevice: (): boolean => {
    if ('hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2;
    }
    
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      return memoryInfo.jsHeapSizeLimit < 1073741824; // Less than 1GB
    }
    
    return false;
  },

  // Optimize for mobile devices
  isMobileDevice: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};