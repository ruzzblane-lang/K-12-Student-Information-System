/**
 * Performance Monitoring Service
 * 
 * Monitors system performance, tracks metrics, provides load testing
 * capabilities, and generates performance reports for scalability validation.
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class PerformanceMonitoringService extends EventEmitter {
  constructor(db, config = {}) {
    super();
    this.db = db;
    this.config = config;
    
    // Performance metrics storage
    this.metrics = {
      transactions: new Map(),
      providers: new Map(),
      system: {
        cpu: [],
        memory: [],
        responseTime: [],
        throughput: []
      }
    };
    
    // Load testing configuration
    this.loadTestConfig = {
      maxConcurrentUsers: config.maxConcurrentUsers || 1000,
      rampUpTime: config.rampUpTime || 60, // seconds
      testDuration: config.testDuration || 300, // seconds
      targetRPS: config.targetRPS || 100 // requests per second
    };
    
    // Performance thresholds
    this.thresholds = {
      responseTime: {
        warning: 2000, // 2 seconds
        critical: 5000 // 5 seconds
      },
      errorRate: {
        warning: 5, // 5%
        critical: 10 // 10%
      },
      throughput: {
        warning: 50, // 50 RPS
        critical: 20 // 20 RPS
      }
    };
    
    // Active load tests
    this.activeLoadTests = new Map();
    
    // Performance tracking intervals
    this.monitoringInterval = null;
    this.startMonitoring();
  }

  /**
   * Start a performance monitoring transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} type - Transaction type
   * @returns {Object} Performance tracker
   */
  async startTransaction(transactionId, type) {
    const tracker = {
      id: transactionId,
      type: type,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      success: null,
      error: null,
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: Date.now()
      }
    };

    this.metrics.transactions.set(transactionId, tracker);
    
    // Emit transaction start event
    this.emit('transactionStart', tracker);
    
    return {
      complete: async (result) => {
        await this.completeTransaction(transactionId, result);
      },
      fail: async (error) => {
        await this.failTransaction(transactionId, error);
      },
      updateMetrics: (metrics) => {
        this.updateTransactionMetrics(transactionId, metrics);
      }
    };
  }

  /**
   * Complete a performance monitoring transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} result - Transaction result
   */
  async completeTransaction(transactionId, result) {
    const tracker = this.metrics.transactions.get(transactionId);
    if (!tracker) return;

    tracker.endTime = Date.now();
    tracker.duration = tracker.endTime - tracker.startTime;
    tracker.success = true;
    tracker.result = result;

    // Update provider metrics if applicable
    if (result.provider) {
      this.updateProviderMetrics(result.provider, tracker.duration, true);
    }

    // Store metrics in database
    await this.storeTransactionMetrics(tracker);

    // Emit transaction complete event
    this.emit('transactionComplete', tracker);

    // Check performance thresholds
    this.checkPerformanceThresholds(tracker);

    // Clean up old transactions
    this.cleanupOldTransactions();
  }

  /**
   * Fail a performance monitoring transaction
   * @param {string} transactionId - Transaction ID
   * @param {Error} error - Error object
   */
  async failTransaction(transactionId, error) {
    const tracker = this.metrics.transactions.get(transactionId);
    if (!tracker) return;

    tracker.endTime = Date.now();
    tracker.duration = tracker.endTime - tracker.startTime;
    tracker.success = false;
    tracker.error = error.message;

    // Update provider metrics if applicable
    if (tracker.result?.provider) {
      this.updateProviderMetrics(tracker.result.provider, tracker.duration, false);
    }

    // Store metrics in database
    await this.storeTransactionMetrics(tracker);

    // Emit transaction fail event
    this.emit('transactionFail', tracker);

    // Check performance thresholds
    this.checkPerformanceThresholds(tracker);

    // Clean up old transactions
    this.cleanupOldTransactions();
  }

  /**
   * Update transaction metrics
   * @param {string} transactionId - Transaction ID
   * @param {Object} metrics - Additional metrics
   */
  updateTransactionMetrics(transactionId, metrics) {
    const tracker = this.metrics.transactions.get(transactionId);
    if (!tracker) return;

    tracker.metrics = {
      ...tracker.metrics,
      ...metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Update provider performance metrics
   * @param {string} providerName - Provider name
   * @param {number} responseTime - Response time in ms
   * @param {boolean} success - Whether the operation was successful
   */
  updateProviderMetrics(providerName, responseTime, success) {
    if (!this.metrics.providers.has(providerName)) {
      this.metrics.providers.set(providerName, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        successRate: 100,
        lastUpdated: Date.now()
      });
    }

    const providerMetrics = this.metrics.providers.get(providerName);
    providerMetrics.totalRequests++;
    providerMetrics.totalResponseTime += responseTime;
    providerMetrics.averageResponseTime = providerMetrics.totalResponseTime / providerMetrics.totalRequests;

    if (success) {
      providerMetrics.successfulRequests++;
    } else {
      providerMetrics.failedRequests++;
    }

    providerMetrics.successRate = (providerMetrics.successfulRequests / providerMetrics.totalRequests) * 100;
    providerMetrics.lastUpdated = Date.now();
  }

  /**
   * Start system performance monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Collect metrics every 5 seconds
  }

  /**
   * Stop system performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const timestamp = Date.now();

    // Store memory metrics
    this.metrics.system.memory.push({
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      timestamp
    });

    // Store CPU metrics
    this.metrics.system.cpu.push({
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp
    });

    // Calculate current throughput
    const currentThroughput = this.calculateCurrentThroughput();
    this.metrics.system.throughput.push({
      rps: currentThroughput,
      timestamp
    });

    // Calculate average response time
    const avgResponseTime = this.calculateAverageResponseTime();
    this.metrics.system.responseTime.push({
      avgResponseTime,
      timestamp
    });

    // Keep only last 1000 data points
    this.trimMetricsArrays();

    // Emit system metrics event
    this.emit('systemMetrics', {
      memory: memoryUsage,
      cpu: cpuUsage,
      throughput: currentThroughput,
      avgResponseTime
    });
  }

  /**
   * Calculate current throughput (requests per second)
   * @returns {number} Current RPS
   */
  calculateCurrentThroughput() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    let requestsInLastSecond = 0;
    for (const [_, tracker] of this.metrics.transactions) {
      if (tracker.startTime >= oneSecondAgo) {
        requestsInLastSecond++;
      }
    }
    
    return requestsInLastSecond;
  }

  /**
   * Calculate average response time
   * @returns {number} Average response time in ms
   */
  calculateAverageResponseTime() {
    let totalTime = 0;
    let count = 0;
    
    for (const [_, tracker] of this.metrics.transactions) {
      if (tracker.duration !== null) {
        totalTime += tracker.duration;
        count++;
      }
    }
    
    return count > 0 ? totalTime / count : 0;
  }

  /**
   * Trim metrics arrays to keep only recent data
   */
  trimMetricsArrays() {
    const maxSize = 1000;
    
    if (this.metrics.system.memory.length > maxSize) {
      this.metrics.system.memory = this.metrics.system.memory.slice(-maxSize);
    }
    
    if (this.metrics.system.cpu.length > maxSize) {
      this.metrics.system.cpu = this.metrics.system.cpu.slice(-maxSize);
    }
    
    if (this.metrics.system.throughput.length > maxSize) {
      this.metrics.system.throughput = this.metrics.system.throughput.slice(-maxSize);
    }
    
    if (this.metrics.system.responseTime.length > maxSize) {
      this.metrics.system.responseTime = this.metrics.system.responseTime.slice(-maxSize);
    }
  }

  /**
   * Check performance thresholds and emit alerts
   * @param {Object} tracker - Transaction tracker
   */
  checkPerformanceThresholds(tracker) {
    const alerts = [];

    // Check response time threshold
    if (tracker.duration > this.thresholds.responseTime.critical) {
      alerts.push({
        type: 'critical',
        metric: 'responseTime',
        value: tracker.duration,
        threshold: this.thresholds.responseTime.critical,
        message: `Response time exceeded critical threshold: ${tracker.duration}ms`
      });
    } else if (tracker.duration > this.thresholds.responseTime.warning) {
      alerts.push({
        type: 'warning',
        metric: 'responseTime',
        value: tracker.duration,
        threshold: this.thresholds.responseTime.warning,
        message: `Response time exceeded warning threshold: ${tracker.duration}ms`
      });
    }

    // Check error rate threshold
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.thresholds.errorRate.critical) {
      alerts.push({
        type: 'critical',
        metric: 'errorRate',
        value: errorRate,
        threshold: this.thresholds.errorRate.critical,
        message: `Error rate exceeded critical threshold: ${errorRate}%`
      });
    } else if (errorRate > this.thresholds.errorRate.warning) {
      alerts.push({
        type: 'warning',
        metric: 'errorRate',
        value: errorRate,
        threshold: this.thresholds.errorRate.warning,
        message: `Error rate exceeded warning threshold: ${errorRate}%`
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.emit('performanceAlert', alert);
    }
  }

  /**
   * Calculate current error rate
   * @returns {number} Error rate percentage
   */
  calculateErrorRate() {
    let totalRequests = 0;
    let failedRequests = 0;
    
    for (const [_, tracker] of this.metrics.transactions) {
      if (tracker.success !== null) {
        totalRequests++;
        if (!tracker.success) {
          failedRequests++;
        }
      }
    }
    
    return totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
  }

  /**
   * Start a load test
   * @param {Object} config - Load test configuration
   * @returns {string} Load test ID
   */
  async startLoadTest(config = {}) {
    const loadTestId = uuidv4();
    const testConfig = {
      ...this.loadTestConfig,
      ...config
    };

    const loadTest = {
      id: loadTestId,
      config: testConfig,
      startTime: Date.now(),
      endTime: null,
      status: 'running',
      results: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        throughput: 0,
        errors: []
      },
      progress: 0
    };

    this.activeLoadTests.set(loadTestId, loadTest);

    // Start the load test
    this.executeLoadTest(loadTest);

    return loadTestId;
  }

  /**
   * Execute a load test
   * @param {Object} loadTest - Load test configuration
   */
  async executeLoadTest(loadTest) {
    const { config } = loadTest;
    const startTime = Date.now();
    const endTime = startTime + (config.testDuration * 1000);
    
    let currentUsers = 0;
    const rampUpInterval = (config.rampUpTime * 1000) / config.maxConcurrentUsers;
    
    // Ramp up users
    const rampUpIntervalId = setInterval(() => {
      if (currentUsers < config.maxConcurrentUsers) {
        currentUsers++;
        this.simulateUserLoad(loadTest, currentUsers);
      } else {
        clearInterval(rampUpIntervalId);
      }
    }, rampUpInterval);

    // Main test loop
    const testInterval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(testInterval);
        clearInterval(rampUpIntervalId);
        this.completeLoadTest(loadTest);
      } else {
        this.updateLoadTestProgress(loadTest);
      }
    }, 1000);
  }

  /**
   * Simulate user load
   * @param {Object} loadTest - Load test object
   * @param {number} userCount - Number of concurrent users
   */
  async simulateUserLoad(loadTest, userCount) {
    const requestsPerUser = loadTest.config.targetRPS / userCount;
    const requestInterval = 1000 / requestsPerUser;

    const userInterval = setInterval(() => {
      if (Date.now() >= loadTest.startTime + (loadTest.config.testDuration * 1000)) {
        clearInterval(userInterval);
        return;
      }

      this.simulatePaymentRequest(loadTest);
    }, requestInterval);
  }

  /**
   * Simulate a payment request
   * @param {Object} loadTest - Load test object
   */
  async simulatePaymentRequest(loadTest) {
    const startTime = Date.now();
    loadTest.results.totalRequests++;

    try {
      // Simulate payment processing time (random between 100ms and 2000ms)
      const processingTime = Math.random() * 1900 + 100;
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Simulate success/failure (95% success rate)
      const success = Math.random() > 0.05;
      
      if (success) {
        loadTest.results.successfulRequests++;
      } else {
        loadTest.results.failedRequests++;
        loadTest.results.errors.push({
          timestamp: new Date().toISOString(),
          error: 'Simulated payment failure'
        });
      }

      const responseTime = Date.now() - startTime;
      loadTest.results.averageResponseTime = 
        (loadTest.results.averageResponseTime * (loadTest.results.totalRequests - 1) + responseTime) / 
        loadTest.results.totalRequests;
      
      loadTest.results.maxResponseTime = Math.max(loadTest.results.maxResponseTime, responseTime);
      loadTest.results.minResponseTime = Math.min(loadTest.results.minResponseTime, responseTime);

    } catch (error) {
      loadTest.results.failedRequests++;
      loadTest.results.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Update load test progress
   * @param {Object} loadTest - Load test object
   */
  updateLoadTestProgress(loadTest) {
    const elapsed = Date.now() - loadTest.startTime;
    const total = loadTest.config.testDuration * 1000;
    loadTest.progress = Math.min((elapsed / total) * 100, 100);
    
    // Calculate current throughput
    const timeElapsed = elapsed / 1000; // seconds
    loadTest.results.throughput = loadTest.results.totalRequests / timeElapsed;

    // Emit progress update
    this.emit('loadTestProgress', {
      id: loadTest.id,
      progress: loadTest.progress,
      results: loadTest.results
    });
  }

  /**
   * Complete a load test
   * @param {Object} loadTest - Load test object
   */
  async completeLoadTest(loadTest) {
    loadTest.endTime = Date.now();
    loadTest.status = 'completed';
    loadTest.progress = 100;

    // Store load test results
    await this.storeLoadTestResults(loadTest);

    // Emit completion event
    this.emit('loadTestComplete', loadTest);

    // Remove from active tests
    this.activeLoadTests.delete(loadTest.id);
  }

  /**
   * Get load test status
   * @param {string} loadTestId - Load test ID
   * @returns {Object} Load test status
   */
  getLoadTestStatus(loadTestId) {
    const loadTest = this.activeLoadTests.get(loadTestId);
    if (!loadTest) {
      // Try to get from database
      return this.getStoredLoadTestResults(loadTestId);
    }
    
    return {
      id: loadTest.id,
      status: loadTest.status,
      progress: loadTest.progress,
      results: loadTest.results,
      config: loadTest.config,
      startTime: loadTest.startTime,
      endTime: loadTest.endTime
    };
  }

  /**
   * Get performance statistics
   * @param {string} tenantId - Tenant ID (optional)
   * @param {string} period - Time period
   * @returns {Object} Performance statistics
   */
  async getPerformanceStatistics(tenantId, period = '30d') {
    try {
      const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
      const params = tenantId ? [tenantId] : [];

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          AVG(duration_ms) as avg_response_time,
          MAX(duration_ms) as max_response_time,
          MIN(duration_ms) as min_response_time,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_transactions,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_transactions,
          AVG(CASE WHEN success = true THEN 1.0 ELSE 0.0 END) * 100 as success_rate
        FROM performance_transactions 
        ${whereClause}
        AND created_at >= NOW() - INTERVAL '${period}'
      `;

      const result = await this.db.query(query, params);
      const stats = result.rows[0];

      return {
        totalTransactions: parseInt(stats.total_transactions),
        averageResponseTime: parseFloat(stats.avg_response_time) || 0,
        maxResponseTime: parseInt(stats.max_response_time) || 0,
        minResponseTime: parseInt(stats.min_response_time) || 0,
        successfulTransactions: parseInt(stats.successful_transactions),
        failedTransactions: parseInt(stats.failed_transactions),
        successRate: parseFloat(stats.success_rate) || 0,
        period: period,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get performance statistics:', error);
      return {
        totalTransactions: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0,
        period: period,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      const currentMemory = process.memoryUsage();
      const currentCpu = process.cpuUsage();
      const currentThroughput = this.calculateCurrentThroughput();
      const avgResponseTime = this.calculateAverageResponseTime();
      const errorRate = this.calculateErrorRate();

      return {
        status: 'healthy',
        memory: {
          rss: currentMemory.rss,
          heapTotal: currentMemory.heapTotal,
          heapUsed: currentMemory.heapUsed,
          external: currentMemory.external
        },
        cpu: {
          user: currentCpu.user,
          system: currentCpu.system
        },
        performance: {
          throughput: currentThroughput,
          averageResponseTime: avgResponseTime,
          errorRate: errorRate
        },
        activeLoadTests: this.activeLoadTests.size,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Store transaction metrics in database
   * @param {Object} tracker - Transaction tracker
   */
  async storeTransactionMetrics(tracker) {
    try {
      const query = `
        INSERT INTO performance_transactions (
          id, tenant_id, transaction_type, duration_ms, success,
          error_message, memory_usage, cpu_usage, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        tracker.id,
        tracker.tenantId || null,
        tracker.type,
        tracker.duration,
        tracker.success,
        tracker.error,
        JSON.stringify(tracker.metrics.memoryUsage),
        JSON.stringify(tracker.metrics.cpuUsage)
      ]);

    } catch (error) {
      console.error('Failed to store transaction metrics:', error);
    }
  }

  /**
   * Store load test results in database
   * @param {Object} loadTest - Load test object
   */
  async storeLoadTestResults(loadTest) {
    try {
      const query = `
        INSERT INTO load_test_results (
          id, config, results, start_time, end_time, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;

      await this.db.query(query, [
        loadTest.id,
        JSON.stringify(loadTest.config),
        JSON.stringify(loadTest.results),
        new Date(loadTest.startTime),
        new Date(loadTest.endTime),
        loadTest.status
      ]);

    } catch (error) {
      console.error('Failed to store load test results:', error);
    }
  }

  /**
   * Get stored load test results
   * @param {string} loadTestId - Load test ID
   * @returns {Object} Load test results
   */
  async getStoredLoadTestResults(loadTestId) {
    try {
      const query = `
        SELECT * FROM load_test_results WHERE id = $1
      `;

      const result = await this.db.query(query, [loadTestId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        status: row.status,
        progress: 100,
        results: JSON.parse(row.results),
        config: JSON.parse(row.config),
        startTime: row.start_time.getTime(),
        endTime: row.end_time.getTime()
      };

    } catch (error) {
      console.error('Failed to get stored load test results:', error);
      return null;
    }
  }

  /**
   * Clean up old transactions from memory
   */
  cleanupOldTransactions() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, tracker] of this.metrics.transactions) {
      if (now - tracker.startTime > maxAge) {
        this.metrics.transactions.delete(id);
      }
    }
  }
}

module.exports = PerformanceMonitoringService;
