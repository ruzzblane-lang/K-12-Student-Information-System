#!/bin/bash

# Health Check Script for School SIS
# Comprehensive health monitoring for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local service=$2
    local message=$3
    
    if [ "$status" = "healthy" ]; then
        echo -e "${GREEN}✅${NC} $service: $message"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️${NC} $service: $message"
    else
        echo -e "${RED}❌${NC} $service: $message"
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local expected_status=${2:-200}
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# Function to check container health
check_container() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")
    
    if [ "$health_status" = "healthy" ]; then
        echo "healthy"
    elif [ "$health_status" = "starting" ]; then
        echo "warning"
    else
        echo "unhealthy"
    fi
}

echo -e "${BLUE}🏥 School SIS Health Check${NC}"
echo "=========================="
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_status "unhealthy" "Docker" "Docker daemon is not running"
    exit 1
fi

# Check if containers are running
echo -e "${BLUE}📦 Container Status${NC}"
echo "-------------------"

# Check Traefik
traefik_status=$(check_container "school-sis-traefik")
if [ "$traefik_status" = "healthy" ]; then
    print_status "healthy" "Traefik" "Container is healthy"
elif [ "$traefik_status" = "warning" ]; then
    print_status "warning" "Traefik" "Container is starting"
else
    print_status "unhealthy" "Traefik" "Container is not healthy or not running"
fi

# Check Caddy
caddy_status=$(check_container "school-sis-caddy")
if [ "$caddy_status" = "healthy" ]; then
    print_status "healthy" "Caddy" "Container is healthy"
elif [ "$caddy_status" = "warning" ]; then
    print_status "warning" "Caddy" "Container is starting"
else
    print_status "unhealthy" "Caddy" "Container is not healthy or not running"
fi

# Check Backend
backend_status=$(check_container "school-sis-backend")
if [ "$backend_status" = "healthy" ]; then
    print_status "healthy" "Backend" "Container is healthy"
elif [ "$backend_status" = "warning" ]; then
    print_status "warning" "Backend" "Container is starting"
else
    print_status "unhealthy" "Backend" "Container is not healthy or not running"
fi

# Check PostgreSQL
postgres_status=$(check_container "school-sis-postgres")
if [ "$postgres_status" = "healthy" ]; then
    print_status "healthy" "PostgreSQL" "Container is healthy"
elif [ "$postgres_status" = "warning" ]; then
    print_status "warning" "PostgreSQL" "Container is starting"
else
    print_status "unhealthy" "PostgreSQL" "Container is not healthy or not running"
fi

# Check Redis
redis_status=$(check_container "school-sis-redis")
if [ "$redis_status" = "healthy" ]; then
    print_status "healthy" "Redis" "Container is healthy"
elif [ "$redis_status" = "warning" ]; then
    print_status "warning" "Redis" "Container is starting"
else
    print_status "unhealthy" "Redis" "Container is not healthy or not running"
fi

echo ""

# Check HTTP endpoints
echo -e "${BLUE}🌐 HTTP Endpoints${NC}"
echo "----------------"

# Get domain from .env file
DOMAIN=$(grep DOMAIN .env 2>/dev/null | cut -d'=' -f2 || echo "localhost")

# Check frontend
frontend_http=$(check_http "http://localhost" 200)
if [ "$frontend_http" = "healthy" ]; then
    print_status "healthy" "Frontend" "HTTP endpoint responding"
else
    print_status "unhealthy" "Frontend" "HTTP endpoint not responding"
fi

# Check backend API
backend_http=$(check_http "http://localhost/api/health" 200)
if [ "$backend_http" = "healthy" ]; then
    print_status "healthy" "Backend API" "API endpoint responding"
else
    print_status "unhealthy" "Backend API" "API endpoint not responding"
fi

# Check Traefik dashboard
traefik_http=$(check_http "http://localhost:8080" 200)
if [ "$traefik_http" = "healthy" ]; then
    print_status "healthy" "Traefik Dashboard" "Dashboard accessible"
else
    print_status "unhealthy" "Traefik Dashboard" "Dashboard not accessible"
fi

echo ""

# Check database connectivity
echo -e "${BLUE}🗄️ Database Connectivity${NC}"
echo "------------------------"

# Check PostgreSQL connection
if docker exec school-sis-postgres pg_isready -U school_sis_admin >/dev/null 2>&1; then
    print_status "healthy" "PostgreSQL" "Database connection successful"
else
    print_status "unhealthy" "PostgreSQL" "Database connection failed"
fi

# Check Redis connection
if docker exec school-sis-redis redis-cli ping >/dev/null 2>&1; then
    print_status "healthy" "Redis" "Cache connection successful"
else
    print_status "unhealthy" "Redis" "Cache connection failed"
fi

echo ""

# Check disk space
echo -e "${BLUE}💾 System Resources${NC}"
echo "-------------------"

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    print_status "healthy" "Disk Space" "Usage: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    print_status "warning" "Disk Space" "Usage: ${disk_usage}% (getting full)"
else
    print_status "unhealthy" "Disk Space" "Usage: ${disk_usage}% (critical)"
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$memory_usage" -lt 80 ]; then
    print_status "healthy" "Memory" "Usage: ${memory_usage}%"
elif [ "$memory_usage" -lt 90 ]; then
    print_status "warning" "Memory" "Usage: ${memory_usage}% (getting full)"
else
    print_status "unhealthy" "Memory" "Usage: ${memory_usage}% (critical)"
fi

echo ""

# Check SSL certificates
echo -e "${BLUE}🔐 SSL Certificates${NC}"
echo "-------------------"

if [ -f "traefik/acme/acme.json" ]; then
    print_status "healthy" "SSL Certificates" "Let's Encrypt certificates found"
else
    print_status "warning" "SSL Certificates" "No Let's Encrypt certificates found (using self-signed)"
fi

echo ""

# Summary
echo -e "${BLUE}📊 Health Check Summary${NC}"
echo "========================"

# Count healthy services
total_checks=0
healthy_checks=0
warning_checks=0
unhealthy_checks=0

# Count container health
for container in "school-sis-traefik" "school-sis-caddy" "school-sis-backend" "school-sis-postgres" "school-sis-redis"; do
    status=$(check_container "$container")
    total_checks=$((total_checks + 1))
    case $status in
        "healthy") healthy_checks=$((healthy_checks + 1)) ;;
        "warning") warning_checks=$((warning_checks + 1)) ;;
        *) unhealthy_checks=$((unhealthy_checks + 1)) ;;
    esac
done

# Count HTTP endpoints
for endpoint in "$frontend_http" "$backend_http" "$traefik_http"; do
    total_checks=$((total_checks + 1))
    if [ "$endpoint" = "healthy" ]; then
        healthy_checks=$((healthy_checks + 1))
    else
        unhealthy_checks=$((unhealthy_checks + 1))
    fi
done

echo "Total Checks: $total_checks"
echo -e "Healthy: ${GREEN}$healthy_checks${NC}"
echo -e "Warnings: ${YELLOW}$warning_checks${NC}"
echo -e "Unhealthy: ${RED}$unhealthy_checks${NC}"

if [ $unhealthy_checks -eq 0 ] && [ $warning_checks -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All systems are healthy!${NC}"
    exit 0
elif [ $unhealthy_checks -eq 0 ]; then
    echo -e "\n${YELLOW}⚠️ System is mostly healthy with some warnings${NC}"
    exit 0
else
    echo -e "\n${RED}❌ System has unhealthy components${NC}"
    exit 1
fi
