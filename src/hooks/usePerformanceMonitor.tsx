import { useCallback } from 'react';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 100;

export function usePerformanceMonitor() {
  const track = useCallback(async <T,>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    const startMark = `${operation}-start`;
    const endMark = `${operation}-end`;
    const measureName = `${operation}-measure`;

    try {
      performance.mark(startMark);
      const result = await fn();
      performance.mark(endMark);
      
      try {
        performance.measure(measureName, startMark, endMark);
        const measure = performance.getEntriesByName(measureName)[0];
        
        const metric: PerformanceMetric = {
          operation,
          duration: measure.duration,
          timestamp: Date.now(),
        };
        
        metrics.push(metric);
        if (metrics.length > MAX_METRICS) {
          metrics.shift();
        }
        
        // Log apenas operações lentas (> 1s)
        if (measure.duration > 1000) {
          console.warn(`⚠️ Operação lenta detectada: ${operation} - ${Math.round(measure.duration)}ms`);
        }
        
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);
      } catch (e) {
        console.error('Erro ao medir performance:', e);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erro em ${operation} após ${Math.round(duration)}ms:`, error);
      throw error;
    }
  }, []);

  const getMetrics = useCallback(() => {
    return [...metrics];
  }, []);

  const getAverageDuration = useCallback((operation: string) => {
    const operationMetrics = metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }, []);

  const clearMetrics = useCallback(() => {
    metrics.length = 0;
  }, []);

  return {
    track,
    getMetrics,
    getAverageDuration,
    clearMetrics,
  };
}
