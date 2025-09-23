#!/bin/bash

# Enhanced Payment Gateway Setup Script
# This script sets up the complete enhanced payment gateway system with all modules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/cmedia-tech-support/school-sis"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DB_DIR="$PROJECT_ROOT/db"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-school_sis}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm first."
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL is not installed. Please install PostgreSQL 13+ first."
    fi
    
    # Check if PostgreSQL is running
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" &> /dev/null; then
        error "PostgreSQL is not running on $DB_HOST:$DB_PORT"
    fi
    
    log "System requirements check passed"
}

# Install backend dependencies
install_backend_dependencies() {
    log "Installing backend dependencies..."
    
    cd "$BACKEND_DIR"
    
    # Install main dependencies
    npm install
    
    # Install payment gateway dependencies
    cd "$BACKEND_DIR/payments"
    npm install
    
    # Install archive module dependencies
    cd "$BACKEND_DIR/archive"
    npm install
    
    # Install security module dependencies
    cd "$BACKEND_DIR/security"
    npm install
    
    log "Backend dependencies installed successfully"
}

# Install frontend dependencies
install_frontend_dependencies() {
    log "Installing frontend dependencies..."
    
    cd "$FRONTEND_DIR"
    npm install
    
    # Install white-label module dependencies
    cd "$FRONTEND_DIR/white-label"
    npm install
    
    log "Frontend dependencies installed successfully"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Create database if it doesn't exist
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
    
    # Run migrations
    log "Running database migrations..."
    cd "$DB_DIR/migrations"
    
    # Run all migrations in order
    for migration in $(ls *.sql | sort); do
        log "Running migration: $migration"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
    done
    
    log "Database setup completed"
}

# Setup environment configuration
setup_environment() {
    log "Setting up environment configuration..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/backend/env.example" "$PROJECT_ROOT/.env"
        warn "Created .env file from template. Please update with your configuration."
    fi
    
    # Create payment gateway configuration
    if [ ! -f "$BACKEND_DIR/payments/.env" ]; then
        cat > "$BACKEND_DIR/payments/.env" << EOF
# Payment Gateway Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Payment Provider Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
ADYEN_API_KEY=your_adyen_api_key

# Security Configuration
PAYMENT_ENCRYPTION_KEY=$(openssl rand -hex 32)
FRAUD_DETECTION_ENABLED=true
COMPLIANCE_AUTOMATION_ENABLED=true

# Currency Configuration
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
DEFAULT_CURRENCY=USD

# Archive Configuration
STORAGE_PATH=./storage/archives
MAX_FILE_SIZE=104857600
ENABLE_VIRUS_SCANNING=false
ENABLE_WATERMARKING=false

# White-Label Configuration
EMBED_BASE_URL=http://localhost:3000
PREVIEW_BASE_URL=http://localhost:3000
EOF
        warn "Created payment gateway .env file. Please update with your API keys."
    fi
    
    log "Environment configuration completed"
}

# Setup storage directories
setup_storage() {
    log "Setting up storage directories..."
    
    # Create storage directories
    mkdir -p "$PROJECT_ROOT/storage/archives/uploads"
    mkdir -p "$PROJECT_ROOT/storage/archives/thumbnails"
    mkdir -p "$PROJECT_ROOT/storage/archives/processed"
    mkdir -p "$PROJECT_ROOT/storage/archives/temp"
    mkdir -p "$PROJECT_ROOT/storage/logs"
    mkdir -p "$PROJECT_ROOT/storage/backups"
    
    # Set permissions
    chmod 755 "$PROJECT_ROOT/storage"
    chmod 755 "$PROJECT_ROOT/storage/archives"
    chmod 755 "$PROJECT_ROOT/storage/logs"
    chmod 755 "$PROJECT_ROOT/storage/backups"
    
    log "Storage directories created successfully"
}

# Setup SSL certificates (for development)
setup_ssl() {
    log "Setting up SSL certificates for development..."
    
    SSL_DIR="$PROJECT_ROOT/ssl"
    mkdir -p "$SSL_DIR"
    
    if [ ! -f "$SSL_DIR/server.crt" ] || [ ! -f "$SSL_DIR/server.key" ]; then
        # Generate self-signed certificate for development
        openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/server.key" -out "$SSL_DIR/server.crt" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log "SSL certificates generated for development"
        warn "These are self-signed certificates for development only. Use proper certificates in production."
    else
        log "SSL certificates already exist"
    fi
}

# Create systemd service files
create_systemd_services() {
    log "Creating systemd service files..."
    
    # Create payment gateway service
    cat > /tmp/school-sis-payment-gateway.service << EOF
[Unit]
Description=School SIS Payment Gateway
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR/payments
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$BACKEND_DIR/payments/.env

[Install]
WantedBy=multi-user.target
EOF

    # Create archive service
    cat > /tmp/school-sis-archive.service << EOF
[Unit]
Description=School SIS Digital Archive
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR/archive
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$BACKEND_DIR/archive/.env

[Install]
WantedBy=multi-user.target
EOF

    # Create frontend service
    cat > /tmp/school-sis-frontend.service << EOF
[Unit]
Description=School SIS Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$FRONTEND_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    log "Systemd service files created in /tmp/"
    warn "To install systemd services, run:"
    warn "sudo cp /tmp/school-sis-*.service /etc/systemd/system/"
    warn "sudo systemctl daemon-reload"
    warn "sudo systemctl enable school-sis-payment-gateway"
    warn "sudo systemctl enable school-sis-archive"
    warn "sudo systemctl enable school-sis-frontend"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Run backend tests
    cd "$BACKEND_DIR"
    npm test || warn "Some backend tests failed"
    
    # Run payment gateway tests
    cd "$BACKEND_DIR/payments"
    npm test || warn "Some payment gateway tests failed"
    
    # Run archive tests
    cd "$BACKEND_DIR/archive"
    npm test || warn "Some archive tests failed"
    
    # Run frontend tests
    cd "$FRONTEND_DIR"
    npm test || warn "Some frontend tests failed"
    
    log "Tests completed"
}

# Create startup scripts
create_startup_scripts() {
    log "Creating startup scripts..."
    
    # Create development startup script
    cat > "$PROJECT_ROOT/start-dev.sh" << 'EOF'
#!/bin/bash

# Development startup script for School SIS Enhanced Payment Gateway

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Starting School SIS Enhanced Payment Gateway in development mode..."

# Start backend services
echo "Starting backend services..."
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!

# Start payment gateway
echo "Starting payment gateway..."
cd "$BACKEND_DIR/payments"
npm run dev &
PAYMENT_PID=$!

# Start archive service
echo "Starting archive service..."
cd "$BACKEND_DIR/archive"
npm run dev &
ARCHIVE_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$FRONTEND_DIR"
npm start &
FRONTEND_PID=$!

echo "All services started!"
echo "Backend PID: $BACKEND_PID"
echo "Payment Gateway PID: $PAYMENT_PID"
echo "Archive Service PID: $ARCHIVE_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user to stop
echo "Press Ctrl+C to stop all services"
trap "kill $BACKEND_PID $PAYMENT_PID $ARCHIVE_PID $FRONTEND_PID; exit" INT
wait
EOF

    chmod +x "$PROJECT_ROOT/start-dev.sh"
    
    # Create production startup script
    cat > "$PROJECT_ROOT/start-prod.sh" << 'EOF'
#!/bin/bash

# Production startup script for School SIS Enhanced Payment Gateway

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting School SIS Enhanced Payment Gateway in production mode..."

# Use systemd services if available
if systemctl is-active --quiet school-sis-payment-gateway; then
    echo "Starting systemd services..."
    sudo systemctl start school-sis-payment-gateway
    sudo systemctl start school-sis-archive
    sudo systemctl start school-sis-frontend
else
    echo "Systemd services not found. Please install them first."
    echo "Run: sudo cp /tmp/school-sis-*.service /etc/systemd/system/"
    echo "Then: sudo systemctl daemon-reload"
    echo "And: sudo systemctl enable school-sis-*"
fi

echo "Production services started!"
EOF

    chmod +x "$PROJECT_ROOT/start-prod.sh"
    
    log "Startup scripts created successfully"
}

# Create monitoring script
create_monitoring_script() {
    log "Creating monitoring script..."
    
    cat > "$PROJECT_ROOT/monitor.sh" << 'EOF'
#!/bin/bash

# Monitoring script for School SIS Enhanced Payment Gateway

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "School SIS Enhanced Payment Gateway - System Monitor"
echo "=================================================="

# Check database connectivity
echo "Checking database connectivity..."
if pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "✓ Database is running"
else
    echo "✗ Database is not accessible"
fi

# Check services
echo "Checking services..."
if systemctl is-active --quiet school-sis-payment-gateway; then
    echo "✓ Payment Gateway service is running"
else
    echo "✗ Payment Gateway service is not running"
fi

if systemctl is-active --quiet school-sis-archive; then
    echo "✓ Archive service is running"
else
    echo "✗ Archive service is not running"
fi

if systemctl is-active --quiet school-sis-frontend; then
    echo "✓ Frontend service is running"
else
    echo "✗ Frontend service is not running"
fi

# Check disk space
echo "Checking disk space..."
DISK_USAGE=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✓ Disk usage: ${DISK_USAGE}%"
else
    echo "⚠ Disk usage: ${DISK_USAGE}% (high)"
fi

# Check memory usage
echo "Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo "✓ Memory usage: ${MEMORY_USAGE}%"
else
    echo "⚠ Memory usage: ${MEMORY_USAGE}% (high)"
fi

echo "=================================================="
echo "Monitor completed at $(date)"
EOF

    chmod +x "$PROJECT_ROOT/monitor.sh"
    
    log "Monitoring script created successfully"
}

# Main setup function
main() {
    log "Starting Enhanced Payment Gateway Setup..."
    log "Project Root: $PROJECT_ROOT"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Please run this script from the project root directory"
    fi
    
    # Run setup steps
    check_root
    check_requirements
    install_backend_dependencies
    install_frontend_dependencies
    setup_database
    setup_environment
    setup_storage
    setup_ssl
    create_systemd_services
    create_startup_scripts
    create_monitoring_script
    
    # Optionally run tests
    if [ "$1" = "--with-tests" ]; then
        run_tests
    fi
    
    log "Enhanced Payment Gateway setup completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Update configuration files with your API keys and settings"
    echo "2. Review and customize the systemd service files in /tmp/"
    echo "3. Start the system in development mode: ./start-dev.sh"
    echo "4. Or install systemd services for production: sudo cp /tmp/school-sis-*.service /etc/systemd/system/"
    echo "5. Monitor the system: ./monitor.sh"
    echo ""
    echo "Configuration files to update:"
    echo "- $PROJECT_ROOT/.env"
    echo "- $BACKEND_DIR/payments/.env"
    echo "- $BACKEND_DIR/archive/.env"
    echo ""
    echo "For more information, see the documentation in the docs/ directory."
}

# Run main function with all arguments
main "$@"
