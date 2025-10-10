import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeBundleSize,
  getMemoryUsage,
  performanceMonitor,
  performanceUtils,
} from "./performance";

describe("performance utilities", () => {
  const originalPerformance = globalThis.performance;
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  let currentTime: number;
  let marks: Map<string, number>;
  let measureEntries: PerformanceEntry[];
  let resourceEntries: PerformanceResourceTiming[];
  let paintEntries: PerformanceEntry[];
  let memoryInfo: { usedJSHeapSize: number };

  const advanceTime = (ms: number) => {
    currentTime += ms;
    vi.advanceTimersByTime(ms);
  };

  beforeEach(() => {
    vi.useFakeTimers();

    currentTime = 0;
    marks = new Map();
    measureEntries = [];
    resourceEntries = [];
    paintEntries = [];
    memoryInfo = { usedJSHeapSize: 0 };

    const mockPerformance = {
      mark: vi.fn((name: string) => {
        marks.set(name, currentTime);
      }),
      measure: vi.fn((name: string, startMark?: string, endMark?: string) => {
        const start = startMark ? (marks.get(startMark) ?? 0) : 0;
        const end = endMark ? (marks.get(endMark) ?? currentTime) : currentTime;
        const entry: PerformanceEntry = {
          name,
          entryType: "measure",
          startTime: start,
          duration: end - start,
          toJSON: () => ({ name, duration: end - start }),
        };
        measureEntries.push(entry);
      }),
      getEntriesByName: vi.fn((name: string) =>
        measureEntries.filter((entry) => entry.name === name),
      ),
      getEntriesByType: vi.fn((type: string) => {
        if (type === "resource") {
          return resourceEntries as unknown as PerformanceEntry[];
        }
        if (type === "paint") {
          return paintEntries;
        }
        return [];
      }),
      now: vi.fn(() => currentTime),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
      memory: memoryInfo,
    } as unknown as Performance;

    globalThis.performance = mockPerformance;
    performanceMonitor.cleanup();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    globalThis.performance = originalPerformance;
    if (originalIntersectionObserver) {
      window.IntersectionObserver = originalIntersectionObserver;
    } else {
      delete (
        window as unknown as {
          IntersectionObserver?: typeof IntersectionObserver;
        }
      ).IntersectionObserver;
    }
    vi.useRealTimers();
  });

  describe("PerformanceMonitor", () => {
    it("records metrics, warns on thresholds, and generates a report", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      performanceMonitor.startNavigation("dashboard");
      advanceTime(1500);
      performanceMonitor.endNavigation("dashboard");

      performanceMonitor.trackComponentRender("Widget", 20);

      const navMetrics = performanceMonitor.getMetricsFor("dashboard");
      const componentMetrics = performanceMonitor.getMetricsFor("Widget");

      expect(navMetrics?.navigationTime).toBe(1500);
      expect(navMetrics?.componentRenderTime).toBe(0);
      expect(componentMetrics?.componentRenderTime).toBe(20);
      expect(componentMetrics?.navigationTime).toBe(0);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Slow navigation to dashboard"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Slow component render: Widget"),
      );

      const report = performanceMonitor.generateReport();
      expect(report).toContain("Performance Report");
      expect(report).toContain("dashboard:");
      expect(report).toContain("Navigation: 1500.00ms");
      expect(report).toContain("Widget:");
      expect(report).toContain("Render: 20.00ms");

      warnSpy.mockRestore();
    });
  });

  describe("resource metrics helpers", () => {
    it("derive values from performance memory and resource entries", async () => {
      memoryInfo.usedJSHeapSize = 128 * 1024 * 1024;
      resourceEntries = [
        {
          entryType: "resource",
          name: "https://cdn.app/assets/main.js",
          startTime: 0,
          duration: 0,
          transferSize: 1024,
          initiatorType: "script",
          nextHopProtocol: "http/2",
          workerStart: 0,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          domainLookupStart: 0,
          domainLookupEnd: 0,
          connectStart: 0,
          secureConnectionStart: 0,
          connectEnd: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          decodedBodySize: 0,
          encodedBodySize: 0,
          serverTiming: [],
          toJSON: () => ({}),
        } as PerformanceResourceTiming,
        {
          entryType: "resource",
          name: "https://cdn.app/assets/chunk.js",
          startTime: 0,
          duration: 0,
          transferSize: 2048,
          initiatorType: "script",
          nextHopProtocol: "http/2",
          workerStart: 0,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          domainLookupStart: 0,
          domainLookupEnd: 0,
          connectStart: 0,
          secureConnectionStart: 0,
          connectEnd: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          decodedBodySize: 0,
          encodedBodySize: 0,
          serverTiming: [],
          toJSON: () => ({}),
        } as PerformanceResourceTiming,
        {
          entryType: "resource",
          name: "https://cdn.app/assets/styles.css",
          startTime: 0,
          duration: 0,
          transferSize: 4096,
          initiatorType: "link",
          nextHopProtocol: "http/2",
          workerStart: 0,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          domainLookupStart: 0,
          domainLookupEnd: 0,
          connectStart: 0,
          secureConnectionStart: 0,
          connectEnd: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          decodedBodySize: 0,
          encodedBodySize: 0,
          serverTiming: [],
          toJSON: () => ({}),
        } as PerformanceResourceTiming,
      ];

      expect(getMemoryUsage()).toBeCloseTo(128);

      const result = await analyzeBundleSize();
      expect(result.totalSize).toBe(3072);
      expect(result.chunks).toEqual([
        { name: "main.js", size: 1024 },
        { name: "chunk.js", size: 2048 },
      ]);
    });
  });

  describe("performanceUtils helpers", () => {
    it("debounce delays execution until the wait time has elapsed", () => {
      const spy = vi.fn();
      const debounced = performanceUtils.debounce(spy, 100);

      debounced("first");
      advanceTime(50);
      debounced("second");
      advanceTime(99);
      expect(spy).not.toHaveBeenCalled();
      advanceTime(1);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("second");
    });

    it("throttle restricts repeated invocations to the configured window", () => {
      const spy = vi.fn();
      const throttled = performanceUtils.throttle(spy, 200);

      throttled("one");
      throttled("two");
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("one");

      advanceTime(199);
      throttled("three");
      expect(spy).toHaveBeenCalledTimes(1);

      advanceTime(1);
      throttled("four");
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith("four");
    });

    it("lazyLoadImage uses IntersectionObserver when available", () => {
      class MockIntersectionObserver {
        static instances: MockIntersectionObserver[] = [];

        callback: IntersectionObserverCallback;
        observe: ReturnType<typeof vi.fn>;
        unobserve: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        takeRecords: ReturnType<typeof vi.fn>;

        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
          this.observe = vi.fn();
          this.unobserve = vi.fn();
          this.disconnect = vi.fn();
          this.takeRecords = vi.fn(() => []);
          MockIntersectionObserver.instances.push(this);
        }

        trigger(entries: Partial<IntersectionObserverEntry>[]) {
          this.callback(
            entries as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver,
          );
        }
      }

      MockIntersectionObserver.instances = [];

      (
        window as unknown as {
          IntersectionObserver?: typeof IntersectionObserver;
        }
      ).IntersectionObserver =
        MockIntersectionObserver as unknown as typeof IntersectionObserver;

      const img = document.createElement("img");
      performanceUtils.lazyLoadImage(img, "https://cdn.app/image.jpg");

      expect(MockIntersectionObserver.instances).toHaveLength(1);
      const observer = MockIntersectionObserver.instances[0];
      expect(observer.observe).toHaveBeenCalledWith(img);

      observer.trigger([
        {
          isIntersecting: true,
          target: img,
        } as unknown as IntersectionObserverEntry,
      ]);

      expect(img.src).toContain("https://cdn.app/image.jpg");
      expect(observer.unobserve).toHaveBeenCalledWith(img);
    });

    it("lazyLoadImage falls back when IntersectionObserver is unavailable", () => {
      delete (
        window as unknown as {
          IntersectionObserver?: typeof IntersectionObserver;
        }
      ).IntersectionObserver;

      const img = document.createElement("img");
      performanceUtils.lazyLoadImage(img, "fallback.jpg");

      expect(img.src).toContain("fallback.jpg");
    });

    it("preloadResource injects a preload link into the document head", () => {
      performanceUtils.preloadResource("/styles.css", "style");

      const link = document.head.querySelector(
        'link[rel="preload"][href="/styles.css"]',
      ) as HTMLLinkElement | null;
      expect(link).not.toBeNull();
      expect(link?.as ?? null).toBe("style");
    });
  });
});
