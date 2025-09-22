import WebSocket from 'ws';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface WebhookConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string;
  tenantSlug?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebhookEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
  tenantId: string;
  userId?: string;
}

export interface WebhookSubscription {
  events: string[];
  callback: (event: WebhookEvent) => void;
}

export class WebhookClient extends EventEmitter {
  private config: WebhookConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private subscriptions = new Map<string, WebhookSubscription>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: WebhookConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  /**
   * Connect to the webhook server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.emit('error', new Error(`Failed to parse message: ${error}`));
          }
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code, reason });
          
          // Attempt to reconnect if not intentionally closed
          if (code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the webhook server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Subscribe to specific events
   */
  subscribe(events: string[], callback: (event: WebhookEvent) => void): string {
    const subscriptionId = crypto.randomUUID();
    this.subscriptions.set(subscriptionId, { events, callback });

    if (this.isConnected) {
      this.sendSubscription(subscriptionId, events);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);

    if (this.isConnected) {
      this.sendUnsubscription(subscriptionId);
    }
  }

  /**
   * Subscribe to student events
   */
  subscribeToStudents(callback: (event: WebhookEvent) => void): string {
    return this.subscribe([
      'student.created',
      'student.updated',
      'student.deleted',
      'student.enrolled',
      'student.transferred',
      'student.graduated'
    ], callback);
  }

  /**
   * Subscribe to grade events
   */
  subscribeToGrades(callback: (event: WebhookEvent) => void): string {
    return this.subscribe([
      'grade.created',
      'grade.updated',
      'grade.deleted',
      'grade.excused',
      'grade.ungraded'
    ], callback);
  }

  /**
   * Subscribe to attendance events
   */
  subscribeToAttendance(callback: (event: WebhookEvent) => void): string {
    return this.subscribe([
      'attendance.marked',
      'attendance.updated',
      'attendance.excused'
    ], callback);
  }

  /**
   * Subscribe to user events
   */
  subscribeToUsers(callback: (event: WebhookEvent) => void): string {
    return this.subscribe([
      'user.created',
      'user.updated',
      'user.deleted',
      'user.login',
      'user.logout'
    ], callback);
  }

  /**
   * Verify webhook signature (for HTTP webhooks)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  private buildWebSocketUrl(): string {
    const url = new URL('/webhooks/ws', this.config.baseUrl);
    
    if (this.config.token) {
      url.searchParams.set('token', this.config.token);
    }
    
    if (this.config.apiKey) {
      url.searchParams.set('apiKey', this.config.apiKey);
    }
    
    if (this.config.tenantSlug) {
      url.searchParams.set('tenantSlug', this.config.tenantSlug);
    }

    // Convert http(s) to ws(s)
    if (url.protocol === 'https:') {
      url.protocol = 'wss:';
    } else if (url.protocol === 'http:') {
      url.protocol = 'ws:';
    }

    return url.toString();
  }

  private handleMessage(message: any): void {
    if (message.type === 'heartbeat') {
      // Respond to heartbeat
      this.sendHeartbeatResponse();
      return;
    }

    if (message.type === 'event' && message.data) {
      const event: WebhookEvent = message.data;
      this.emit('event', event);
      this.notifySubscribers(event);
    }
  }

  private notifySubscribers(event: WebhookEvent): void {
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.events.includes(event.event) || subscription.events.includes('*')) {
        try {
          subscription.callback(event);
        } catch (error) {
          this.emit('subscription_error', { subscriptionId, event, error });
        }
      }
    }
  }

  private sendSubscription(subscriptionId: string, events: string[]): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        subscriptionId,
        events
      }));
    }
  }

  private sendUnsubscription(subscriptionId: string): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        subscriptionId
      }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeatResponse(): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'pong' }));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    setTimeout(() => {
      this.connect().catch(error => {
        this.emit('reconnect_failed', { attempt: this.reconnectAttempts, error });
      });
    }, this.config.reconnectInterval);
  }
}
