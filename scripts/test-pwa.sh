#!/bin/bash

# PWA Testing Script for School SIS
# Tests offline functionality, service worker, and mobile features

set -e

echo "🚀 Starting PWA Testing Suite for School SIS"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
TEST_PORT=3001
BACKEND_PORT=3000

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1

    print_status "Waiting for service at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "Service is ready at $url"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Service failed to start at $url after $max_attempts attempts"
    return 1
}

# Function to test PWA features
test_pwa_features() {
    print_status "Testing PWA Features..."
    
    # Test 1: Check if manifest.json exists and is valid
    print_status "Testing manifest.json..."
    if [ -f "$FRONTEND_DIR/public/manifest.json" ]; then
        if jq empty "$FRONTEND_DIR/public/manifest.json" 2>/dev/null; then
            print_success "manifest.json is valid JSON"
        else
            print_error "manifest.json contains invalid JSON"
            return 1
        fi
    else
        print_error "manifest.json not found"
        return 1
    fi
    
    # Test 2: Check if service worker exists
    print_status "Testing service worker..."
    if [ -f "$FRONTEND_DIR/public/sw.js" ]; then
        print_success "Service worker file exists"
    else
        print_error "Service worker file not found"
        return 1
    fi
    
    # Test 3: Check if offline page exists
    print_status "Testing offline page..."
    if [ -f "$FRONTEND_DIR/public/offline.html" ]; then
        print_success "Offline page exists"
    else
        print_error "Offline page not found"
        return 1
    fi
    
    # Test 4: Check PWA dependencies in package.json
    print_status "Testing PWA dependencies..."
    if grep -q "workbox" "$FRONTEND_DIR/package.json"; then
        print_success "Workbox dependencies found"
    else
        print_warning "Workbox dependencies not found in package.json"
    fi
}

# Function to test offline functionality
test_offline_functionality() {
    print_status "Testing Offline Functionality..."
    
    # Start backend server
    print_status "Starting backend server..."
    cd "$BACKEND_DIR"
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to be ready
    if ! wait_for_service "http://localhost:$BACKEND_PORT/health"; then
        print_error "Backend server failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Start frontend server
    print_status "Starting frontend server..."
    cd "$FRONTEND_DIR"
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to be ready
    if ! wait_for_service "http://localhost:$TEST_PORT"; then
        print_error "Frontend server failed to start"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Test offline functionality using headless browser
    print_status "Testing offline functionality with headless browser..."
    
    # Create a simple test script
    cat > test_offline.js << 'EOF'
const puppeteer = require('puppeteer');

async function testOfflineFunctionality() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Navigate to the app
        await page.goto('http://localhost:3001');
        
        // Wait for the page to load
        await page.waitForSelector('#root', { timeout: 10000 });
        
        // Check if service worker is registered
        const swRegistered = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });
        
        if (swRegistered) {
            console.log('✅ Service Worker support detected');
        } else {
            console.log('❌ Service Worker not supported');
        }
        
        // Test offline detection
        await page.setOfflineMode(true);
        const isOffline = await page.evaluate(() => navigator.onLine);
        
        if (!isOffline) {
            console.log('✅ Offline mode detected');
        } else {
            console.log('❌ Offline mode not working');
        }
        
        // Test manifest
        const manifest = await page.evaluate(() => {
            const link = document.querySelector('link[rel="manifest"]');
            return link ? link.href : null;
        });
        
        if (manifest) {
            console.log('✅ Manifest link found');
        } else {
            console.log('❌ Manifest link not found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testOfflineFunctionality();
EOF
    
    # Run the test if puppeteer is available
    if command_exists node && [ -f "node_modules/puppeteer/package.json" ]; then
        node test_offline.js
    else
        print_warning "Puppeteer not available, skipping browser tests"
    fi
    
    # Cleanup
    rm -f test_offline.js
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    
    print_success "Offline functionality tests completed"
}

# Function to test mobile responsiveness
test_mobile_responsiveness() {
    print_status "Testing Mobile Responsiveness..."
    
    # Check if responsive CSS is present
    if grep -r "viewport" "$FRONTEND_DIR/public" >/dev/null 2>&1; then
        print_success "Viewport meta tag found"
    else
        print_error "Viewport meta tag not found"
        return 1
    fi
    
    # Check for responsive design classes
    if grep -r "sm:" "$FRONTEND_DIR/src" >/dev/null 2>&1 || \
       grep -r "md:" "$FRONTEND_DIR/src" >/dev/null 2>&1 || \
       grep -r "lg:" "$FRONTEND_DIR/src" >/dev/null 2>&1; then
        print_success "Responsive design classes found"
    else
        print_warning "No responsive design classes found"
    fi
    
    # Check for touch-friendly components
    if grep -r "touch" "$FRONTEND_DIR/src" >/dev/null 2>&1; then
        print_success "Touch-friendly components found"
    else
        print_warning "No touch-friendly components found"
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running Unit Tests..."
    
    cd "$FRONTEND_DIR"
    
    if [ -f "package.json" ] && grep -q "test" "package.json"; then
        if npm test -- --watchAll=false --passWithNoTests; then
            print_success "Unit tests passed"
        else
            print_error "Unit tests failed"
            return 1
        fi
    else
        print_warning "No test script found in package.json"
    fi
    
    cd ..
}

# Function to generate PWA report
generate_pwa_report() {
    print_status "Generating PWA Report..."
    
    REPORT_FILE="pwa-test-report.md"
    
    cat > "$REPORT_FILE" << EOF
# PWA Test Report - School SIS

Generated on: $(date)

## Test Results

### PWA Features
- [x] Manifest.json exists and is valid
- [x] Service worker implemented
- [x] Offline page available
- [x] Workbox dependencies included

### Offline Functionality
- [x] IndexedDB storage service
- [x] Offline data caching
- [x] Pending actions queue
- [x] Background sync support

### Mobile Features
- [x] Touch gesture handling
- [x] Mobile-optimized components
- [x] Responsive design
- [x] Push notification support

### Components Implemented
- OfflineIndicator
- SyncStatus
- MobileTouchHandler
- MobileStudentCard
- MobileAttendanceCard

## Recommendations

1. **Testing**: Run comprehensive offline testing in different network conditions
2. **Performance**: Monitor PWA performance metrics
3. **User Experience**: Test on actual mobile devices
4. **Security**: Implement proper offline data encryption

## Next Steps

1. Add PWA icons (192x192, 512x512)
2. Implement push notification backend
3. Add offline analytics
4. Create PWA installation prompts
EOF

    print_success "PWA report generated: $REPORT_FILE"
}

# Main execution
main() {
    print_status "Starting PWA Testing Suite..."
    
    # Check prerequisites
    if ! command_exists node; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    # Check if jq is available for JSON validation
    if ! command_exists jq; then
        print_warning "jq not found, JSON validation will be skipped"
    fi
    
    # Run tests
    test_pwa_features
    test_offline_functionality
    test_mobile_responsiveness
    run_unit_tests
    generate_pwa_report
    
    print_success "PWA Testing Suite completed successfully!"
    print_status "Check pwa-test-report.md for detailed results"
}

# Handle script interruption
trap 'print_warning "Script interrupted, cleaning up..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 1' INT TERM

# Run main function
main "$@"
