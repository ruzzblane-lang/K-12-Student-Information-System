#!/bin/bash

# White-Label Frontend Setup Script
# This script sets up the white-label frontend shell for the K-12 Student Information System

set -e

echo "🚀 Setting up White-Label Frontend Shell for K-12 Student Information System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Checking prerequisites..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "Node.js version $(node --version) is compatible"
    else
        print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version | cut -d'.' -f1)
    if [ "$NPM_VERSION" -ge 8 ]; then
        print_status "npm version $(npm --version) is compatible"
    else
        print_error "npm version 8 or higher is required. Current version: $(npm --version)"
        exit 1
    fi
else
    print_error "npm is not installed. Please install npm 8 or higher."
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    print_status "Docker is available"
else
    print_warning "Docker is not installed. Docker is required for production deployment."
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null && docker compose version &> /dev/null; then
    print_status "Docker Compose is available"
else
    print_warning "Docker Compose is not installed. Docker Compose is required for production deployment."
fi

echo ""
print_info "Installing frontend dependencies..."

# Install frontend dependencies
cd frontend
if [ ! -d "node_modules" ]; then
    print_info "Installing npm packages..."
    npm install
    print_status "Frontend dependencies installed"
else
    print_status "Frontend dependencies already installed"
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    print_info "Building frontend for production..."
    npm run build
    print_status "Frontend built successfully"
else
    print_status "Frontend build already exists"
fi

cd ..

echo ""
print_info "Setting up development environment..."

# Create environment file if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << EOF
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_TENANT_ID=default
REACT_APP_THEME=default
REACT_APP_LANGUAGE=en
REACT_APP_DEBUG=true
EOF
    print_status "Created frontend/.env.local"
else
    print_status "Frontend environment file already exists"
fi

echo ""
print_info "Testing frontend components..."

# Run linting
cd frontend
if npm run lint &> /dev/null; then
    print_status "Frontend linting passed"
else
    print_warning "Frontend linting found issues. Run 'npm run lint:fix' to fix them."
fi

# Run tests if available
if npm run test -- --watchAll=false &> /dev/null; then
    print_status "Frontend tests passed"
else
    print_warning "Frontend tests failed or are not configured"
fi

cd ..

echo ""
print_info "Setting up Docker configuration..."

# Check if Docker network exists
if docker network ls | grep -q "traefik-public"; then
    print_status "Traefik network exists"
else
    print_info "Creating Traefik network..."
    docker network create traefik-public
    print_status "Traefik network created"
fi

echo ""
print_info "Creating sample theme configuration..."

# Create sample theme configuration
mkdir -p frontend/public/themes
cat > frontend/public/themes/sample-theme.json << EOF
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "accent": "#F59E0B",
    "background": "#F9FAFB",
    "surface": "#FFFFFF",
    "text": "#111827",
    "textSecondary": "#6B7280"
  },
  "fonts": {
    "primary": "Inter, system-ui, sans-serif",
    "secondary": "Roboto, system-ui, sans-serif",
    "monospace": "Fira Code, Consolas, monospace"
  },
  "branding": {
    "logo": "/logos/sample-logo.png",
    "favicon": "/favicons/sample-favicon.ico",
    "name": "Sample School",
    "tagline": "Excellence in Education"
  },
  "layout": {
    "sidebarWidth": "16rem",
    "headerHeight": "4rem",
    "borderRadius": "0.5rem"
  }
}
EOF
print_status "Sample theme configuration created"

echo ""
print_info "Creating sample logo and favicon directories..."

# Create directories for branding assets
mkdir -p frontend/public/logos
mkdir -p frontend/public/favicons
mkdir -p frontend/public/themes

# Create placeholder files
touch frontend/public/logos/sample-logo.png
touch frontend/public/favicons/sample-favicon.ico

print_status "Branding asset directories created"

echo ""
print_info "Setting up development scripts..."

# Create development script
cat > scripts/dev-frontend.sh << 'EOF'
#!/bin/bash

# Development script for frontend
echo "🚀 Starting frontend development server..."

cd frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start development server
echo "Starting React development server on http://localhost:3000"
npm start
EOF

chmod +x scripts/dev-frontend.sh
print_status "Development script created"

# Create build script
cat > scripts/build-frontend.sh << 'EOF'
#!/bin/bash

# Build script for frontend
echo "🏗️ Building frontend for production..."

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run linting
echo "Running linting..."
npm run lint

# Build for production
echo "Building for production..."
npm run build

echo "✅ Frontend build completed successfully!"
echo "Build files are in: frontend/build/"
EOF

chmod +x scripts/build-frontend.sh
print_status "Build script created"

# Create Docker build script
cat > scripts/docker-build-frontend.sh << 'EOF'
#!/bin/bash

# Docker build script for frontend
echo "🐳 Building frontend Docker image..."

# Build the Docker image
docker build -t school-sis-frontend:latest ./frontend

echo "✅ Frontend Docker image built successfully!"
echo "Image: school-sis-frontend:latest"
EOF

chmod +x scripts/docker-build-frontend.sh
print_status "Docker build script created"

echo ""
print_info "Creating documentation links..."

# Create quick start guide
cat > frontend/QUICK_START.md << 'EOF'
# Quick Start Guide

## Development

1. Start the development server:
   ```bash
   npm start
   ```

2. Open http://localhost:3000 in your browser

## Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Serve the build directory with a web server

## Docker

1. Build the Docker image:
   ```bash
   docker build -t school-sis-frontend .
   ```

2. Run the container:
   ```bash
   docker run -p 80:80 school-sis-frontend
   ```

## Theming

1. Edit `src/config/theme.js` to customize colors and fonts
2. Update `src/styles/theme.css` for additional styling
3. Use CSS variables in your components: `var(--color-primary)`

## Internationalization

1. Add translations to `src/config/i18n.js`
2. Use the `useTranslation` hook in components
3. Switch languages dynamically

## API Integration

1. Update API endpoints in component files
2. Add mock data for development
3. Implement error handling and loading states
EOF

print_status "Quick start guide created"

echo ""
print_info "Running final checks..."

# Check if all required files exist
REQUIRED_FILES=(
    "frontend/src/App.js"
    "frontend/src/config/theme.js"
    "frontend/src/config/i18n.js"
    "frontend/src/styles/theme.css"
    "frontend/src/components/ui/Card.jsx"
    "frontend/src/components/ui/Chart.jsx"
    "frontend/src/components/ui/Table.jsx"
    "frontend/src/pages/DashboardPage.jsx"
    "frontend/src/pages/PortalPage.jsx"
    "frontend/src/pages/YearbookPage.jsx"
    "frontend/src/pages/PaymentsPage.jsx"
    "frontend/src/pages/ArchivePage.jsx"
    "frontend/Dockerfile"
    "frontend/nginx.conf"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "✓ $file"
    else
        print_error "✗ $file is missing"
    fi
done

echo ""
echo "🎉 White-Label Frontend Shell Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo "1. Start development server: ./scripts/dev-frontend.sh"
echo "2. Build for production: ./scripts/build-frontend.sh"
echo "3. Build Docker image: ./scripts/docker-build-frontend.sh"
echo "4. Read documentation: frontend/WHITE_LABEL_FRONTEND_GUIDE.md"
echo ""
echo "🌐 Available Pages:"
echo "- Dashboard: http://localhost:3000/dashboard"
echo "- Portal: http://localhost:3000/portal"
echo "- Yearbook: http://localhost:3000/yearbook"
echo "- Payments: http://localhost:3000/payments"
echo "- Archive: http://localhost:3000/archive"
echo ""
echo "🎨 Theming:"
echo "- Edit src/config/theme.js for colors and fonts"
echo "- Use CSS variables: var(--color-primary)"
echo "- Test themes with different configurations"
echo ""
echo "🌍 Internationalization:"
echo "- Add translations to src/config/i18n.js"
echo "- Use useTranslation hook in components"
echo "- Test language switching"
echo ""
echo "🔧 Customization:"
echo "- Add new pages in src/pages/"
echo "- Create components in src/components/ui/"
echo "- Update navigation in src/layouts/MainLayout.jsx"
echo ""
echo "Happy coding! 🚀"
