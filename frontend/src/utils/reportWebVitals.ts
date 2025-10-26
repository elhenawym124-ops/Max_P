/**
 * Web Vitals Reporting
 * 
 * Reports Core Web Vitals metrics for performance monitoring
 */

import { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Default reporter that logs to console in development
const defaultReporter: ReportHandler = (metric) => {
  if (import.meta.env.DEV) {
    console.log('Web Vital:', metric);
  }

  // In production, you might want to send to analytics
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    // gtag('event', metric.name, {
    //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // });
  }
};

// Export with default reporter
export { reportWebVitals };

// Auto-report with default reporter
reportWebVitals(defaultReporter);
