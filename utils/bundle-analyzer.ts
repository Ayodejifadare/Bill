// Bundle analysis and optimization utilities

interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    type: "js" | "css" | "asset";
    isLazy: boolean;
  }>;
  recommendations: string[];
}

export class BundleAnalyzer {
  private static instance: BundleAnalyzer;

  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer();
    }
    return BundleAnalyzer.instance;
  }

  async analyzeBundles(): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunks: [],
      recommendations: [],
    };

    // Get all resource entries
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];

    for (const resource of resources) {
      const size = resource.transferSize || resource.encodedBodySize || 0;
      const name = this.extractFileName(resource.name);
      const type = this.getResourceType(resource.name);

      if (type && size > 0) {
        analysis.chunks.push({
          name,
          size,
          type,
          isLazy: this.isLazyChunk(resource.name),
        });
        analysis.totalSize += size;
      }
    }

    // Sort chunks by size (largest first)
    analysis.chunks.sort((a, b) => b.size - a.size);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  private extractFileName(url: string): string {
    return url.split("/").pop() || "unknown";
  }

  private getResourceType(url: string): "js" | "css" | "asset" | null {
    if (url.endsWith(".js")) return "js";
    if (url.endsWith(".css")) return "css";
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return "asset";
    return null;
  }

  private isLazyChunk(url: string): boolean {
    // Check if the chunk name suggests it's lazy-loaded
    return (
      url.includes("lazy") ||
      url.includes("chunk") ||
      url.match(/\d+\.[a-f0-9]+\.js$/)
    );
  }

  private generateRecommendations(analysis: BundleAnalysis): string[] {
    const recommendations: string[] = [];
    const jsChunks = analysis.chunks.filter((chunk) => chunk.type === "js");
    const totalJSSize = jsChunks.reduce((sum, chunk) => sum + chunk.size, 0);

    // Large bundle warnings
    if (totalJSSize > 1000000) {
      // 1MB
      recommendations.push(
        "⚠️ Total JavaScript bundle size exceeds 1MB. Consider code splitting.",
      );
    }

    // Large individual chunks
    jsChunks.forEach((chunk) => {
      if (chunk.size > 500000) {
        // 500KB
        recommendations.push(
          `⚠️ Large chunk detected: ${chunk.name} (${this.formatSize(chunk.size)})`,
        );
      }
    });

    // Lazy loading suggestions
    const nonLazyChunks = jsChunks.filter(
      (chunk) => !chunk.isLazy && chunk.size > 100000,
    );
    if (nonLazyChunks.length > 0) {
      recommendations.push(
        "💡 Consider lazy loading these large components: " +
          nonLazyChunks.map((chunk) => chunk.name).join(", "),
      );
    }

    // Asset optimization
    const assetChunks = analysis.chunks.filter(
      (chunk) => chunk.type === "asset",
    );
    const largeAssets = assetChunks.filter((chunk) => chunk.size > 200000);
    if (largeAssets.length > 0) {
      recommendations.push(
        "🖼️ Large assets detected. Consider image optimization: " +
          largeAssets.map((chunk) => chunk.name).join(", "),
      );
    }

    // CSS suggestions
    const cssChunks = analysis.chunks.filter((chunk) => chunk.type === "css");
    const totalCSSSize = cssChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (totalCSSSize > 200000) {
      // 200KB
      recommendations.push(
        "🎨 CSS bundle is large. Consider critical CSS extraction.",
      );
    }

    // Performance budget warnings
    if (analysis.totalSize > 2000000) {
      // 2MB
      recommendations.push(
        "🚨 Total bundle size exceeds 2MB performance budget!",
      );
    }

    return recommendations;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  generateReport(analysis: BundleAnalysis): string {
    const report = [
      "📊 Bundle Analysis Report",
      "========================",
      "",
      `Total Bundle Size: ${this.formatSize(analysis.totalSize)}`,
      "",
      "📦 Chunks by Size:",
      "----------------",
    ];

    analysis.chunks.forEach((chunk, index) => {
      const icon =
        chunk.type === "js" ? "📜" : chunk.type === "css" ? "🎨" : "🖼️";
      const lazy = chunk.isLazy ? " (lazy)" : "";
      report.push(
        `${index + 1}. ${icon} ${chunk.name}: ${this.formatSize(chunk.size)}${lazy}`,
      );
    });

    if (analysis.recommendations.length > 0) {
      report.push("", "💡 Recommendations:", "----------------");
      analysis.recommendations.forEach((rec) => report.push(rec));
    }

    return report.join("\n");
  }
}

// Performance optimization recommendations
export const optimizationRecommendations = {
  // Code splitting recommendations
  codeSplitting: {
    byRoute: "Split components by route using React.lazy()",
    byFeature: "Split large features into separate bundles",
    vendor: "Separate vendor libraries from application code",
  },

  // Asset optimization
  assets: {
    images: "Use WebP format and responsive images",
    compression: "Enable gzip/brotli compression",
    caching: "Implement proper cache headers",
  },

  // JavaScript optimization
  javascript: {
    treeshaking: "Ensure unused code is eliminated",
    minification: "Use terser for production builds",
    polyfills: "Only include necessary polyfills",
  },

  // CSS optimization
  css: {
    purge: "Remove unused CSS classes",
    critical: "Extract critical CSS for above-the-fold content",
    combine: "Combine small CSS files",
  },
};

// Bundle optimization utilities
export const bundleOptimizer = {
  // Check if a module should be lazy loaded
  shouldLazyLoad: (moduleName: string): boolean => {
    const heavyModules = [
      "SpendingInsightsScreen",
      "TransactionHistoryScreen",
      "RecurringPaymentsScreen",
      "GroupAccountScreen",
      "ContactSyncScreen",
    ];
    return heavyModules.includes(moduleName);
  },

  // Preload critical resources
  preloadCritical: () => {
    const criticalResources = [
      { href: "/components/HomeScreen.js", as: "script" },
      { href: "/components/BottomNavigation.js", as: "script" },
      { href: "/styles/globals.css", as: "style" },
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = resource.href;
      link.as = resource.as;
      document.head.appendChild(link);
    });
  },

  // Prefetch non-critical resources
  prefetchNonCritical: () => {
    const nonCriticalResources = [
      "/components/SpendingInsightsScreen.js",
      "/components/TransactionHistoryScreen.js",
      "/components/ContactSyncScreen.js",
    ];

    nonCriticalResources.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      document.head.appendChild(link);
    });
  },
};

export const bundleAnalyzer = BundleAnalyzer.getInstance();
