#!/bin/bash

# AI Integration Setup Script
# This script sets up the complete AI integration system with all modules

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
AI_DIR="$BACKEND_DIR/ai"
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
    log "Checking system requirements for AI integration..."
    
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
    
    # Check for AI service dependencies
    if ! command -v python3 &> /dev/null; then
        warn "Python 3 is not installed. Some AI features may not work properly."
    fi
    
    log "System requirements check passed"
}

# Install AI dependencies
install_ai_dependencies() {
    log "Installing AI integration dependencies..."
    
    cd "$AI_DIR"
    
    # Install main AI dependencies
    npm install
    
    # Install additional AI-specific packages
    npm install sharp pdf-parse mammoth cheerio marked
    
    # Install AI service dependencies
    npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
    
    log "AI dependencies installed successfully"
}

# Setup AI environment configuration
setup_ai_environment() {
    log "Setting up AI environment configuration..."
    
    # Create AI .env file if it doesn't exist
    if [ ! -f "$AI_DIR/.env" ]; then
        cat > "$AI_DIR/.env" << EOF
# AI Integration Configuration
NODE_ENV=development
PORT=3002

# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Azure AI Configuration
AZURE_AI_ENDPOINT=your_azure_ai_endpoint_here
AZURE_AI_API_KEY=your_azure_ai_api_key_here
AZURE_AI_REGION=your_azure_region_here

# Google Cloud Configuration
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here

# Compliance Configuration
DATA_RESIDENCY=global
ENCRYPTION_ENABLED=true
AUDIT_LOGGING=true
GDPR_COMPLIANT=true
FERPA_COMPLIANT=true

# AI Module Configuration
SMART_SEARCH_ENABLED=true
AUTOMATED_TAGGING_ENABLED=true
LEARNING_INSIGHTS_ENABLED=true
TRANSLATION_ACCESSIBILITY_ENABLED=true
FRAUD_DETECTION_ENABLED=true
GENERATIVE_SUMMARIES_ENABLED=true
RECOMMENDATIONS_ENABLED=true
CONVERSATIONAL_INTERFACE_ENABLED=true

# Performance Configuration
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
AI_RATE_LIMIT_ENABLED=true
AI_MAX_REQUESTS_PER_MINUTE=100

# Security Configuration
AI_ENCRYPTION_KEY=$(openssl rand -hex 32)
AI_AUDIT_TRAIL_SECRET=$(openssl rand -hex 32)
EOF
        warn "Created AI .env file. Please update with your API keys."
    fi
    
    log "AI environment configuration completed"
}

# Setup AI database
setup_ai_database() {
    log "Setting up AI database tables..."
    
    # Run AI migration
    log "Running AI integration migration..."
    cd "$DB_DIR/migrations"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "030_ai_integration_tables.sql"
    
    log "AI database setup completed"
}

# Initialize AI knowledge base
initialize_ai_knowledge_base() {
    log "Initializing AI knowledge base..."
    
    # Create sample knowledge base entries
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Insert sample knowledge base entries
INSERT INTO knowledge_base (tenant_id, knowledge_base_type, title, content, source, relevance_score, metadata) VALUES
('00000000-0000-0000-0000-000000000000', 'general_knowledge', 'School Hours', 'Our school is open Monday through Friday from 8:00 AM to 4:00 PM.', 'school_handbook', 0.9, '{"category": "general", "tags": ["hours", "schedule"]}'),
('00000000-0000-0000-0000-000000000000', 'general_knowledge', 'Contact Information', 'For general inquiries, please contact the main office at (555) 123-4567 or email info@school.edu', 'school_handbook', 0.9, '{"category": "contact", "tags": ["phone", "email"]}'),
('00000000-0000-0000-0000-000000000000', 'academic_knowledge', 'Grading Policy', 'Grades are based on assignments (40%), tests (30%), participation (20%), and projects (10%).', 'academic_policy', 0.95, '{"category": "academic", "tags": ["grading", "policy"]}'),
('00000000-0000-0000-0000-000000000000', 'policy_knowledge', 'Attendance Policy', 'Students must maintain at least 90% attendance to pass each class.', 'attendance_policy', 0.9, '{"category": "policy", "tags": ["attendance", "requirements"]}');

-- Insert sample content catalog entries
INSERT INTO content_catalog (tenant_id, title, type, subject, grade_level, difficulty, tags, metadata, access_count, rating) VALUES
('00000000-0000-0000-0000-000000000000', 'Introduction to Algebra', 'document', 'mathematics', '9', 'medium', '["algebra", "math", "introduction"]', '{"format": "pdf", "pages": 50}', 150, 4.2),
('00000000-0000-0000-0000-000000000000', 'World History Timeline', 'video', 'history', '10', 'easy', '["history", "timeline", "world"]', '{"duration": "15:30", "format": "mp4"}', 89, 4.5),
('00000000-0000-0000-0000-000000000000', 'Chemistry Lab Safety', 'document', 'science', '11', 'medium', '["chemistry", "safety", "lab"]', '{"format": "pdf", "pages": 25}', 67, 4.0),
('00000000-0000-0000-0000-000000000000', 'Creative Writing Prompts', 'document', 'english', '12', 'easy', '["writing", "creative", "prompts"]', '{"format": "docx", "pages": 30}', 123, 4.3);

EOF
    
    log "AI knowledge base initialized with sample data"
}

# Setup AI service configuration
setup_ai_service_config() {
    log "Setting up AI service configuration..."
    
    # Create AI service configuration file
    cat > "$AI_DIR/config/ai-services.json" << EOF
{
  "services": {
    "openai": {
      "enabled": true,
      "models": {
        "default": "gpt-4",
        "summarization": "gpt-3.5-turbo",
        "translation": "gpt-3.5-turbo"
      },
      "rateLimits": {
        "requestsPerMinute": 60,
        "tokensPerMinute": 150000
      }
    },
    "azure": {
      "enabled": true,
      "services": {
        "translation": true,
        "speech": true,
        "vision": true
      },
      "rateLimits": {
        "requestsPerMinute": 100,
        "charactersPerMinute": 1000000
      }
    },
    "google": {
      "enabled": true,
      "services": {
        "translation": true,
        "speech": true,
        "vision": true
      },
      "rateLimits": {
        "requestsPerMinute": 100,
        "charactersPerMinute": 1000000
      }
    }
  },
  "modules": {
    "smart-search": {
      "enabled": true,
      "features": {
        "semanticSearch": true,
        "naturalLanguageQueries": true,
        "contextAwareResults": true
      }
    },
    "automated-tagging": {
      "enabled": true,
      "features": {
        "ocr": true,
        "contentAnalysis": true,
        "automaticTagging": true
      }
    },
    "learning-insights": {
      "enabled": true,
      "features": {
        "performanceAnalysis": true,
        "trendAnalysis": true,
        "recommendations": true
      },
      "compliance": {
        "ferpaCompliant": true,
        "gdprCompliant": true,
        "consentRequired": true
      }
    },
    "translation-accessibility": {
      "enabled": true,
      "features": {
        "textTranslation": true,
        "textToSpeech": true,
        "speechToText": true,
        "documentTranslation": true
      },
      "languages": {
        "supported": ["en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "ar", "hi"],
        "default": "en"
      }
    },
    "fraud-detection": {
      "enabled": true,
      "features": {
        "paymentRiskAssessment": true,
        "realTimeMonitoring": true,
        "anomalyDetection": true,
        "behavioralAnalysis": true
      }
    },
    "generative-summaries": {
      "enabled": true,
      "features": {
        "documentSummarization": true,
        "reportGeneration": true,
        "actionItemExtraction": true
      }
    },
    "recommendations": {
      "enabled": true,
      "features": {
        "contentBased": true,
        "collaborativeFiltering": true,
        "hybridRecommendations": true
      }
    },
    "conversational-interface": {
      "enabled": true,
      "features": {
        "intentClassification": true,
        "contextAwareResponses": true,
        "multiPortalSupport": true
      }
    }
  }
}
EOF
    
    log "AI service configuration created"
}

# Create AI startup scripts
create_ai_startup_scripts() {
    log "Creating AI startup scripts..."
    
    # Create AI development startup script
    cat > "$PROJECT_ROOT/start-ai-dev.sh" << 'EOF'
#!/bin/bash

# AI Development startup script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$PROJECT_ROOT/backend/ai"

echo "Starting AI Integration Hub in development mode..."

# Start AI services
echo "Starting AI Integration Hub..."
cd "$AI_DIR"
npm run dev &
AI_PID=$!

echo "AI Integration Hub started with PID: $AI_PID"
echo "AI API available at: http://localhost:3002"
echo "AI Health Check: http://localhost:3002/ai/health"

# Wait for user to stop
echo "Press Ctrl+C to stop AI services"
trap "kill $AI_PID; exit" INT
wait
EOF

    chmod +x "$PROJECT_ROOT/start-ai-dev.sh"
    
    # Create AI production startup script
    cat > "$PROJECT_ROOT/start-ai-prod.sh" << 'EOF'
#!/bin/bash

# AI Production startup script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$PROJECT_ROOT/backend/ai"

echo "Starting AI Integration Hub in production mode..."

# Start AI services
echo "Starting AI Integration Hub..."
cd "$AI_DIR"
npm start &
AI_PID=$!

echo "AI Integration Hub started with PID: $AI_PID"
echo "AI API available at: http://localhost:3002"

# Wait for user to stop
echo "Press Ctrl+C to stop AI services"
trap "kill $AI_PID; exit" INT
wait
EOF

    chmod +x "$PROJECT_ROOT/start-ai-prod.sh"
    
    log "AI startup scripts created successfully"
}

# Create AI monitoring script
create_ai_monitoring_script() {
    log "Creating AI monitoring script..."
    
    cat > "$PROJECT_ROOT/monitor-ai.sh" << 'EOF'
#!/bin/bash

# AI Monitoring script

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "AI Integration Hub - System Monitor"
echo "=================================="

# Check AI service health
echo "Checking AI service health..."
if curl -s http://localhost:3002/ai/health > /dev/null; then
    echo "✓ AI Integration Hub is running"
    
    # Get AI service status
    echo "Getting AI service status..."
    curl -s http://localhost:3002/ai/health | jq '.' 2>/dev/null || echo "AI service is running but jq is not available for JSON formatting"
else
    echo "✗ AI Integration Hub is not running"
fi

# Check AI modules status
echo "Checking AI modules status..."
if curl -s http://localhost:3002/ai/modules/status > /dev/null; then
    echo "✓ AI modules status endpoint is accessible"
else
    echo "✗ AI modules status endpoint is not accessible"
fi

# Check database connectivity
echo "Checking database connectivity..."
if pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "✓ Database is running"
else
    echo "✗ Database is not accessible"
fi

# Check AI-specific tables
echo "Checking AI database tables..."
AI_TABLES=(
    "ai_operation_logs"
    "ai_search_logs"
    "ai_processing_results"
    "student_consent_records"
    "learning_insights_logs"
    "ai_translation_logs"
    "ai_speech_logs"
    "fraud_risk_assessments"
    "real_time_monitoring_logs"
    "ai_summary_logs"
    "ai_recommendation_logs"
    "conversation_logs"
    "user_profiles"
    "user_interactions"
    "content_catalog"
    "knowledge_base"
)

for table in "${AI_TABLES[@]}"; do
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U postgres -d school_sis -c "\dt $table" &> /dev/null; then
        echo "✓ Table $table exists"
    else
        echo "✗ Table $table is missing"
    fi
done

echo "=================================="
echo "AI Monitor completed at $(date)"
EOF

    chmod +x "$PROJECT_ROOT/monitor-ai.sh"
    
    log "AI monitoring script created successfully"
}

# Create AI test script
create_ai_test_script() {
    log "Creating AI test script..."
    
    cat > "$PROJECT_ROOT/test-ai.sh" << 'EOF'
#!/bin/bash

# AI Test script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$PROJECT_ROOT/backend/ai"

echo "Running AI Integration Tests..."
echo "=============================="

# Check if AI service is running
if ! curl -s http://localhost:3002/ai/health > /dev/null; then
    echo "Error: AI Integration Hub is not running. Please start it first with ./start-ai-dev.sh"
    exit 1
fi

# Test AI health endpoint
echo "Testing AI health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3002/ai/health)
if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    echo "✓ AI health check passed"
else
    echo "✗ AI health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test AI modules status
echo "Testing AI modules status..."
MODULES_RESPONSE=$(curl -s http://localhost:3002/ai/modules/status)
if echo "$MODULES_RESPONSE" | grep -q "modules"; then
    echo "✓ AI modules status check passed"
else
    echo "✗ AI modules status check failed"
    echo "Response: $MODULES_RESPONSE"
fi

# Test smart search (if enabled)
echo "Testing smart search..."
SEARCH_RESPONSE=$(curl -s -X POST http://localhost:3002/ai/search \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
  -H "X-User-ID: 00000000-0000-0000-0000-000000000000" \
  -d '{"query": "test search", "limit": 5}')
if echo "$SEARCH_RESPONSE" | grep -q "results"; then
    echo "✓ Smart search test passed"
else
    echo "✗ Smart search test failed"
    echo "Response: $SEARCH_RESPONSE"
fi

# Test conversational interface (if enabled)
echo "Testing conversational interface..."
CONVERSATION_RESPONSE=$(curl -s -X POST http://localhost:3002/ai/conversation/message \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
  -H "X-User-ID: 00000000-0000-0000-0000-000000000000" \
  -d '{"message": "Hello", "conversationId": "test-conversation", "context": {"portalType": "student_portal"}}')
if echo "$CONVERSATION_RESPONSE" | grep -q "response"; then
    echo "✓ Conversational interface test passed"
else
    echo "✗ Conversational interface test failed"
    echo "Response: $CONVERSATION_RESPONSE"
fi

echo "=============================="
echo "AI Integration tests completed"
EOF

    chmod +x "$PROJECT_ROOT/test-ai.sh"
    
    log "AI test script created successfully"
}

# Run AI tests
run_ai_tests() {
    log "Running AI integration tests..."
    
    cd "$AI_DIR"
    
    # Run unit tests
    if [ -f "package.json" ] && grep -q "test" package.json; then
        npm test || warn "Some AI tests failed"
    else
        warn "No AI tests found to run"
    fi
    
    log "AI tests completed"
}

# Main setup function
main() {
    log "Starting AI Integration Setup..."
    log "Project Root: $PROJECT_ROOT"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Please run this script from the project root directory"
    fi
    
    # Check if AI directory exists
    if [ ! -d "$AI_DIR" ]; then
        error "AI directory not found. Please ensure the AI integration is properly installed."
    fi
    
    # Run setup steps
    check_root
    check_requirements
    install_ai_dependencies
    setup_ai_environment
    setup_ai_database
    initialize_ai_knowledge_base
    setup_ai_service_config
    create_ai_startup_scripts
    create_ai_monitoring_script
    create_ai_test_script
    
    # Optionally run tests
    if [ "$1" = "--with-tests" ]; then
        run_ai_tests
    fi
    
    log "AI Integration setup completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Update AI configuration files with your API keys:"
    echo "   - $AI_DIR/.env"
    echo "   - $AI_DIR/config/ai-services.json"
    echo ""
    echo "2. Start AI services in development mode:"
    echo "   ./start-ai-dev.sh"
    echo ""
    echo "3. Test AI integration:"
    echo "   ./test-ai.sh"
    echo ""
    echo "4. Monitor AI services:"
    echo "   ./monitor-ai.sh"
    echo ""
    echo "AI API Endpoints:"
    echo "- Health Check: http://localhost:3002/ai/health"
    echo "- Module Status: http://localhost:3002/ai/modules/status"
    echo "- Smart Search: POST http://localhost:3002/ai/search"
    echo "- Conversational Interface: POST http://localhost:3002/ai/conversation/message"
    echo ""
    echo "For more information, see the documentation in the docs/ directory."
}

# Run main function with all arguments
main "$@"
