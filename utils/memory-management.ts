// Memory management utilities for React applications

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private metrics: MemoryMetrics[] = [];
  private observers: Set<Function> = new Set();
  private cleanupTasks: Set<Function> = new Set();
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Start memory monitoring
  startMonitoring(intervalMs: number = 30000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkMemoryThresholds();
    }, intervalMs);

    // Initial collection
    this.collectMetrics();
  }

  // Stop memory monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  // Collect current memory metrics
  private collectMetrics() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const metrics: MemoryMetrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      this.metrics.push(metrics);

      // Keep only last 100 measurements
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Notify observers
      this.observers.forEach(observer => observer(metrics));
    }
  }

  // Check memory thresholds and trigger cleanup if needed
  private checkMemoryThresholds() {
    const latest = this.getLatestMetrics();
    if (!latest) return;

    const usagePercentage = (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;

    if (usagePercentage > 80) {
      console.warn(`High memory usage: ${usagePercentage.toFixed(2)}%`);
      this.triggerCleanup();
    }

    if (usagePercentage > 90) {
      console.error(`Critical memory usage: ${usagePercentage.toFixed(2)}%`);
      this.forcefulCleanup();
    }
  }

  // Register a cleanup task
  registerCleanupTask(cleanupFn: Function) {
    this.cleanupTasks.add(cleanupFn);
    
    // Return unregister function
    return () => {
      this.cleanupTasks.delete(cleanupFn);
    };
  }

  // Trigger all cleanup tasks
  private triggerCleanup() {
    console.log('Triggering memory cleanup...');
    this.cleanupTasks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Forceful cleanup for critical memory situations
  private forcefulCleanup() {
    console.log('Triggering forceful cleanup...');
    
    // Clear metrics history
    this.metrics = this.metrics.slice(-10);
    
    // Trigger all cleanup tasks
    this.triggerCleanup();
    
    // Clear image caches
    this.clearImageCaches();
    
    // Clear unused event listeners
    this.clearEventListeners();
  }

  // Clear image caches
  private clearImageCaches() {
    // Remove unused images from DOM
    const images = document.querySelectorAll('img[data-lazy="loaded"]');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (!isVisible) {
        (img as HTMLImageElement).src = '';
        img.removeAttribute('data-lazy');
      }
    });
  }

  // Clear unused event listeners
  private clearEventListeners() {
    // This would need to be implemented based on your specific event handling
    console.log('Clearing unused event listeners...');
  }

  // Add memory usage observer
  addObserver(observer: Function) {
    this.observers.add(observer);
    
    // Return unsubscribe function
    return () => {
      this.observers.delete(observer);
    };
  }

  // Get latest memory metrics
  getLatestMetrics(): MemoryMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get memory usage percentage
  getMemoryUsagePercentage(): number {
    const latest = this.getLatestMetrics();
    if (!latest) return 0;
    
    return (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;
  }

  // Get memory trend
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metrics.length < 10) return 'stable';
    
    const recent = this.metrics.slice(-10);
    const first = recent[0].usedJSHeapSize;
    const last = recent[recent.length - 1].usedJSHeapSize;
    const difference = last - first;
    const threshold = first * 0.1; // 10% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  // Format memory size for display
  formatMemorySize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Generate memory report
  generateReport(): string {
    const latest = this.getLatestMetrics();
    if (!latest) return 'No memory data available';

    const usagePercentage = this.getMemoryUsagePercentage();
    const trend = this.getMemoryTrend();

    return [
      'Memory Usage Report',
      '==================',
      `Used: ${this.formatMemorySize(latest.usedJSHeapSize)}`,
      `Total: ${this.formatMemorySize(latest.totalJSHeapSize)}`,
      `Limit: ${this.formatMemorySize(latest.jsHeapSizeLimit)}`,
      `Usage: ${usagePercentage.toFixed(2)}%`,
      `Trend: ${trend}`,
      `Cleanup tasks: ${this.cleanupTasks.size}`,
      `Observers: ${this.observers.size}`
    ].join('\n');
  }

  // Cleanup all resources
  cleanup() {
    this.stopMonitoring();
    this.metrics = [];
    this.observers.clear();
    this.cleanupTasks.clear();
  }
}

// React hook for memory monitoring
export const useMemoryMonitoring = (options: {
  enabled?: boolean;
  threshold?: number;
  onHighMemory?: () => void;
} = {}) => {
  const { enabled = true, threshold = 80, onHighMemory } = options;

  React.useEffect(() => {
    if (!enabled) return;

    const memoryManager = MemoryManager.getInstance();
    
    const unsubscribe = memoryManager.addObserver((metrics: MemoryMetrics) => {
      const usagePercentage = (metrics.usedJSHeapSize / metrics.jsHeapSizeLimit) * 100;
      
      if (usagePercentage > threshold && onHighMemory) {
        onHighMemory();
      }
    });

    memoryManager.startMonitoring();

    return () => {
      unsubscribe();
      memoryManager.stopMonitoring();
    };
  }, [enabled, threshold, onHighMemory]);

  return {
    getMemoryUsage: () => MemoryManager.getInstance().getMemoryUsagePercentage(),
    getMemoryTrend: () => MemoryManager.getInstance().getMemoryTrend(),
    triggerCleanup: () => MemoryManager.getInstance()['triggerCleanup']()
  };
};

// React hook for component cleanup registration
export const useCleanup = (cleanupFn: () => void) => {
  React.useEffect(() => {
    const memoryManager = MemoryManager.getInstance();
    const unregister = memoryManager.registerCleanupTask(cleanupFn);
    
    return unregister;
  }, [cleanupFn]);
};

// Memory optimization utilities
export const memoryOptimization = {
  // Debounce expensive operations
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate?: boolean
  ): T => {
    let timeout: NodeJS.Timeout | null = null;
    
    return ((...args: any[]) => {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(null, args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(null, args);
    }) as T;
  },

  // Throttle high-frequency events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let inThrottle: boolean;
    
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },

  // Weak reference cache for preventing memory leaks
  createWeakCache: <K extends object, V>() => {
    const cache = new WeakMap<K, V>();
    
    return {
      get: (key: K): V | undefined => cache.get(key),
      set: (key: K, value: V): void => cache.set(key, value),
      has: (key: K): boolean => cache.has(key),
      delete: (key: K): boolean => cache.delete(key)
    };
  },

  // Image lazy loading with memory management
  lazyLoadImage: (img: HTMLImageElement, src: string) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            img.setAttribute('data-lazy', 'loaded');
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });
      
      observer.observe(img);
      
      // Register cleanup
      MemoryManager.getInstance().registerCleanupTask(() => {
        observer.disconnect();
      });
    } else {
      img.src = src;
    }
  },

  // Check if device has memory constraints
  isMemoryConstrained: (): boolean => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit < 1073741824; // Less than 1GB
    }
    
    if ('hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2;
    }
    
    return false;
  }
};

export const memoryManager = MemoryManager.getInstance();

// Global React import for hooks
declare global {
  const React: typeof import('react');
}