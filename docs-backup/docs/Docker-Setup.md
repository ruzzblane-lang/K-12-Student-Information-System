# Docker Setup Guide for School SIS

## Overview

This guide explains the Docker Compose infrastructure for the K-12 Student Information System, which uses a reverse proxy architecture to eliminate CORS errors and provide a scalable, production-ready deployment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Traefik (Port 80/443)                       │
│              - Reverse Proxy & Router                      │
│              - Let's Encrypt SSL                           │
│              - Load Balancing                              │
│              - Health Checks                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
│   Caddy      │ │Backend │ │  PostgreSQL │
│ (Port 80)    │ │(Port   │ │ (Port 5432) │
│              │ │ 3000)  │ │             │
│ - Static     │ │        │ │ - SSL       │
│   Files      │ │ - API  │ │ - Restricted│
│ - SPA        │ │ - Auth │ │   Access    │
│   Support    │ │ - DB   │ │ - Audit     │
│ - Compression│ │   Conn │ │   Logs      │
└──────────────┘ └────────┘ └─────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
              ┌───────▼──────┐
              │    Redis     │
              │ (Port 6379)  │
              │              │
              │ - Caching    │
              │ - Sessions   │
              │ - Rate Limit │
              └──────────────┘
```

## Why This Architecture?

### Traefik as Global Proxy

**Traefik** serves as the primary reverse proxy and router for several key reasons:

1. **Automatic Service Discovery**: Traefik automatically discovers services through Docker labels, eliminating manual configuration
2. **Let's Encrypt Integration**: Built-in support for automatic SSL certificate generation and renewal
3. **Load Balancing**: Distributes traffic across multiple backend instances
4. **Health Checks**: Monitors service health and removes unhealthy instances from rotation
5. **Dynamic Configuration**: Updates routing rules without service restarts
6. **Middleware Support**: Provides CORS, rate limiting, authentication, and other middleware out of the box

### Caddy for Frontend Static Serving

**Caddy** is used specifically for serving frontend static files because:

1. **Optimized Static File Serving**: Superior performance for static assets with built-in compression
2. **SPA Support**: Automatic fallback to `index.html` for client-side routing
3. **Advanced Caching**: Intelligent cache headers for different asset types
4. **Security Headers**: Built-in security headers for static content
5. **Lightweight**: Minimal resource usage compared to full web servers
6. **HTTP/2 Support**: Native HTTP/2 support for better performance

### CORS Elimination

This architecture eliminates CORS issues by:

1. **Single Domain**: All services are served from the same domain (`yourdomain.com`)
2. **Path-Based Routing**: 
   - `/` → Caddy (frontend)
   - `/api` → Backend (API)
3. **Internal Communication**: Backend and database communicate over internal networks
4. **No Cross-Origin Requests**: Frontend and API are served from the same origin

## Service Configuration

### Traefik Configuration

**File**: `traefik/traefik.yml`

```yaml
# Key features:
- Automatic HTTPS with Let's Encrypt
- Docker service discovery
- Health check monitoring
- Security headers middleware
- Rate limiting
- Circuit breaker protection
```

**File**: `traefik/dynamic.yml`

```yaml
# Dynamic configuration for:
- CORS middleware for API routes
- Security headers
- Rate limiting policies
- Circuit breaker configuration
- Authentication middleware
```

### Caddy Configuration

**File**: `caddy/Caddyfile`

```caddy
# Features:
- Static file serving from /srv
- SPA routing support
- Compression (gzip, zstd)
- Security headers
- Cache optimization
- Health check endpoint
```

### Backend Configuration

**File**: `backend/Dockerfile`

```dockerfile
# Multi-stage build:
- Node.js 18 Alpine base
- Non-root user for security
- Health check integration
- Optimized for production
```

### Database Configuration

**File**: `postgres/init/01-init-database.sql`

```sql
-- Features:
- Multi-user setup (admin, app, readonly)
- Row-level security (RLS)
- Audit logging
- SSL configuration
- Performance optimization
```

## Environment Configuration

### Environment Variables

Copy `env.docker.example` to `.env` and configure:

```bash
# Domain and SSL
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Database
POSTGRES_DB=school_sis
POSTGRES_USER=school_sis_admin
POSTGRES_PASSWORD=secure_password

# Application
JWT_SECRET=your_jwt_secret
NODE_ENV=production

# Integrations
GOOGLE_CLIENT_ID=your_google_client_id
STRIPE_SECRET_KEY=your_stripe_key
# ... other integration keys
```

### Security Considerations

1. **Strong Passwords**: Use strong, unique passwords for all services
2. **Environment Isolation**: Separate development, staging, and production environments
3. **Secret Management**: Use external secret management in production (AWS Secrets Manager, HashiCorp Vault)
4. **Regular Updates**: Keep all container images updated
5. **Network Security**: Services communicate over internal networks only

## Quick Start

### 1. Initial Setup

```bash
# Clone repository and setup
git clone <repository>
cd school-sis

# Initial setup
make setup

# Edit environment variables
nano .env
```

### 2. Start Services

```bash
# Start all services
make up

# Or quick start (setup + start)
make quick-start
```

### 3. Verify Deployment

```bash
# Check service health
make health

# View logs
make logs

# Check status
make status
```

## Development Workflow

### Daily Development

```bash
# Start development environment
make dev

# View backend logs
make logs-backend

# Access backend shell
make shell

# Run tests
make test
```

### Database Operations

```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Create backup
make backup

# Restore backup
make restore BACKUP_FILE=backup_20240101_120000.sql
```

## Production Deployment

### 1. Production Setup

```bash
# Configure production environment
cp env.docker.example .env
# Edit .env with production values

# Generate SSL certificates (Let's Encrypt will handle this automatically)
make ssl-certs

# Start production services
make prod
```

### 2. Monitoring

```bash
# Monitor resource usage
make monitor

# Check service health
make health

# View logs
make logs
```

### 3. Maintenance

```bash
# Update services
make update

# Create backups
make backup

# Clean up old resources
make clean
```

## Extending the Architecture

### Adding New Services

To add a new service (e.g., payment API, yearbook service):

1. **Add to docker-compose.yml**:
```yaml
new-service:
  image: your-service:latest
  networks:
    - traefik-public
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.new-service.rule=Host(`${DOMAIN}`) && PathPrefix(`/new-service`)"
    - "traefik.http.routers.new-service.entrypoints=websecure"
    - "traefik.http.routers.new-service.tls.certresolver=letsencrypt"
```

2. **Update Traefik routing** in `traefik/dynamic.yml`:
```yaml
http:
  routers:
    new-service:
      rule: "Host(`${DOMAIN}`) && PathPrefix(`/new-service`)"
      middlewares:
        - security-headers
        - rate-limit
      service: new-service
```

3. **Add environment variables** to `.env`:
```bash
NEW_SERVICE_API_KEY=your_api_key
NEW_SERVICE_URL=https://api.newservice.com
```

### Scaling Services

To scale backend services:

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Traefik will automatically load balance across instances
```

### Adding Load Balancers

For high-traffic deployments, add external load balancers:

```yaml
# In docker-compose.yml
services:
  traefik:
    deploy:
      replicas: 2
    labels:
      - "traefik.http.services.traefik.loadbalancer.server.port=8080"
```

## TLS and Domain Configuration

### Let's Encrypt Setup

1. **Configure domain** in `.env`:
```bash
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com
```

2. **DNS Configuration**:
```bash
# Point your domain to your server
A    yourdomain.com        -> YOUR_SERVER_IP
A    traefik.yourdomain.com -> YOUR_SERVER_IP
```

3. **Automatic Certificate Generation**:
   - Traefik automatically requests certificates from Let's Encrypt
   - Certificates are stored in `traefik/acme/acme.json`
   - Automatic renewal every 60 days

### Custom SSL Certificates

For custom certificates:

1. **Place certificates** in `traefik/certs/`:
```bash
traefik/certs/
├── default.crt
└── default.key
```

2. **Update Traefik configuration**:
```yaml
tls:
  stores:
    default:
      defaultCertificate:
        certFile: /etc/traefik/certs/default.crt
        keyFile: /etc/traefik/certs/default.key
```

## Troubleshooting

### Common Issues

1. **Services not starting**:
```bash
# Check logs
make logs

# Check environment
make env-check

# Restart services
make restart
```

2. **SSL certificate issues**:
```bash
# Check Traefik logs
make logs-traefik

# Verify domain configuration
nslookup yourdomain.com
```

3. **Database connection issues**:
```bash
# Check database logs
make logs-db

# Test database connection
make shell-db
```

4. **CORS errors**:
```bash
# Verify Traefik routing
curl -H "Host: yourdomain.com" http://localhost/api/health

# Check CORS middleware configuration
```

### Debug Mode

Enable debug logging:

```bash
# Edit .env
LOG_LEVEL=debug

# Restart services
make restart
```

### Performance Issues

Monitor resource usage:

```bash
# Real-time monitoring
make monitor

# Check service health
make health

# Review logs for errors
make logs
```

## Security Best Practices

### Network Security

1. **Internal Networks**: Database and Redis are only accessible from backend
2. **Firewall Rules**: Only ports 80, 443, and 8080 (Traefik dashboard) are exposed
3. **SSL/TLS**: All external communication is encrypted

### Container Security

1. **Non-root Users**: All containers run as non-root users
2. **Read-only Filesystems**: Where possible, containers use read-only filesystems
3. **Resource Limits**: Set appropriate CPU and memory limits
4. **Regular Updates**: Keep all images updated

### Data Security

1. **Encryption at Rest**: Database uses SSL/TLS
2. **Encryption in Transit**: All external communication is encrypted
3. **Audit Logging**: All database changes are logged
4. **Backup Encryption**: Regular encrypted backups

## Backup and Recovery

### Automated Backups

```bash
# Create backup
make backup

# Schedule regular backups (add to crontab)
0 2 * * * cd /path/to/school-sis && make backup
```

### Disaster Recovery

1. **Restore from backup**:
```bash
make restore BACKUP_FILE=backup_20240101_120000.sql
```

2. **Full system recovery**:
```bash
# Restore from backup
make restore BACKUP_FILE=latest_backup.sql

# Restart services
make up

# Verify functionality
make health
```

## Monitoring and Alerting

### Health Monitoring

```bash
# Check all services
make health

# Monitor resource usage
make monitor

# View service status
make status
```

### Log Monitoring

```bash
# View all logs
make logs

# View specific service logs
make logs-backend
make logs-db
make logs-traefik
```

### Production Monitoring

For production deployments, consider:

1. **Prometheus + Grafana**: For metrics and dashboards
2. **ELK Stack**: For log aggregation and analysis
3. **Uptime Monitoring**: External monitoring services
4. **Alerting**: Email/SMS alerts for service failures

## Conclusion

This Docker Compose architecture provides:

- ✅ **CORS-free environment** through single-domain routing
- ✅ **Automatic SSL** with Let's Encrypt
- ✅ **Scalable architecture** with load balancing
- ✅ **Security best practices** with network isolation
- ✅ **Easy maintenance** with comprehensive tooling
- ✅ **Production-ready** configuration

The architecture is designed to grow with your needs while maintaining security, performance, and ease of management.
