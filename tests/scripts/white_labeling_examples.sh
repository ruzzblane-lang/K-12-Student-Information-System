#!/bin/bash

# White-Labeling API Test Examples
# This script demonstrates how to use the white-labeling API endpoints

# Configuration
BASE_URL="http://localhost:3000/api"
TENANT_ID="your-tenant-uuid"
JWT_TOKEN="your-jwt-token"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== White-Labeling API Test Examples ===${NC}\n"

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}${description}${NC}"
    echo -e "Request: ${method} ${endpoint}"
    
    if [ -n "$data" ]; then
        echo -e "Data: ${data}"
        curl -X $method \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -d "$data" \
            "$BASE_URL$endpoint" | jq .
    else
        curl -X $method \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$BASE_URL$endpoint" | jq .
    fi
    
    echo -e "\n${GREEN}---${NC}\n"
}

# 1. Get current branding configuration
api_call "GET" "/white-labeling/branding" "" "1. Get Current Branding Configuration"

# 2. Update basic branding (colors and logo)
api_call "PUT" "/white-labeling/branding" '{
  "colors": {
    "primary": "#dc2626",
    "secondary": "#ef4444",
    "header_background": "#ffffff",
    "footer_background": "#f8fafc",
    "text": "#1f2937",
    "link": "#dc2626",
    "button": "#dc2626",
    "button_text": "#ffffff",
    "accent": "#059669",
    "border": "#e5e7eb"
  },
  "logo_url": "https://cdn.example.com/springfield-logo.png",
  "custom_content": {
    "footer_text": "© 2024 Springfield High School. All rights reserved.",
    "welcome_message": "Welcome to Springfield High School Student Portal!",
    "login_message": "Please sign in to access your student account."
  }
}' "2. Update Basic Branding (Colors and Logo)"

# 3. Get generated CSS
echo -e "${YELLOW}3. Get Generated CSS${NC}"
echo -e "Request: GET /white-labeling/css/$TENANT_ID"
curl -H "Authorization: Bearer $JWT_TOKEN" \
    "$BASE_URL/white-labeling/css/$TENANT_ID" | head -20
echo -e "\n${GREEN}---${NC}\n"

# 4. Update email templates
api_call "PUT" "/white-labeling/email-templates" '{
  "templates": {
    "welcome": {
      "subject": "Welcome to {{school_name}} Student Portal",
      "template": "<html><body style=\"font-family: Arial, sans-serif;\"><h1>Welcome {{first_name}}!</h1><p>Welcome to {{school_name}} Student Portal. You can now access your grades, attendance, and other important information.</p><p>Best regards,<br>{{school_name}} Administration</p></body></html>",
      "from_name": "{{school_name}} Administration"
    },
    "password_reset": {
      "subject": "Reset Your Password - {{school_name}}",
      "template": "<html><body style=\"font-family: Arial, sans-serif;\"><h1>Password Reset Request</h1><p>Hello {{first_name}},</p><p>You requested to reset your password for {{school_name}} Student Portal.</p><p><a href=\"{{reset_link}}\" style=\"background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">Reset Password</a></p><p>If you did not request this, please ignore this email.</p></body></html>"
    },
    "grade_notification": {
      "subject": "New Grade Posted - {{school_name}}",
      "template": "<html><body style=\"font-family: Arial, sans-serif;\"><h1>New Grade Posted</h1><p>Hello {{parent_name}},</p><p>A new grade has been posted for {{student_name}} in {{class_name}}.</p><p>Grade: {{grade}}<br>Assignment: {{assignment_name}}</p><p>Log in to view more details.</p></body></html>"
    }
  }
}' "4. Update Email Templates"

# 5. Update dashboard widgets
api_call "PUT" "/white-labeling/dashboard-widgets" '{
  "enabled_widgets": ["grades", "attendance", "announcements", "calendar", "upcoming_assignments"],
  "layout": "grid",
  "widget_order": ["announcements", "grades", "attendance", "upcoming_assignments", "calendar"],
  "custom_widgets": [
    {
      "id": "school_news",
      "title": "School News",
      "type": "rss_feed",
      "config": {
        "url": "https://springfield.edu/news/rss",
        "max_items": 5,
        "show_images": true
      }
    },
    {
      "id": "weather",
      "title": "Weather",
      "type": "weather_widget",
      "config": {
        "location": "Springfield, IL",
        "units": "fahrenheit"
      }
    }
  ]
}' "5. Update Dashboard Widgets"

# 6. Update navigation menu
api_call "PUT" "/white-labeling/navigation-menu" '{
  "main_menu": [
    {
      "label": "Dashboard",
      "url": "/dashboard",
      "icon": "home",
      "order": 1
    },
    {
      "label": "Grades",
      "url": "/grades",
      "icon": "chart-bar",
      "order": 2
    },
    {
      "label": "Attendance",
      "url": "/attendance",
      "icon": "calendar",
      "order": 3
    },
    {
      "label": "Assignments",
      "url": "/assignments",
      "icon": "clipboard-list",
      "order": 4
    },
    {
      "label": "Messages",
      "url": "/messages",
      "icon": "chat",
      "order": 5
    }
  ],
  "footer_menu": [
    {
      "label": "About Us",
      "url": "/about",
      "order": 1
    },
    {
      "label": "Contact",
      "url": "/contact",
      "order": 2
    },
    {
      "label": "Privacy Policy",
      "url": "/privacy",
      "order": 3
    },
    {
      "label": "Terms of Service",
      "url": "/terms",
      "order": 4
    }
  ]
}' "6. Update Navigation Menu"

# 7. Update support contact
api_call "PUT" "/white-labeling/support-contact" '{
  "email": "support@springfield.edu",
  "phone": "+1-217-555-0123",
  "hours": "Monday-Friday 8:00 AM - 5:00 PM CST",
  "chat_enabled": true,
  "ticket_system": "zendesk",
  "knowledge_base_url": "https://help.springfield.edu",
  "emergency_contact": {
    "phone": "+1-217-555-9111",
    "available": "24/7 for emergencies"
  }
}' "7. Update Support Contact Information"

# 8. Update social media links
api_call "PUT" "/white-labeling/social-media" '{
  "facebook": "https://facebook.com/springfieldhighschool",
  "twitter": "https://twitter.com/springfieldhigh",
  "instagram": "https://instagram.com/springfieldhighschool",
  "linkedin": "https://linkedin.com/school/springfield-high-school",
  "youtube": "https://youtube.com/springfieldhighschool",
  "tiktok": "https://tiktok.com/@springfieldhigh"
}' "8. Update Social Media Links"

# 9. Update analytics configuration
api_call "PUT" "/white-labeling/analytics" '{
  "google_analytics_id": "GA-123456789-1",
  "google_tag_manager_id": "GTM-ABC123",
  "facebook_pixel_id": "123456789012345",
  "custom_events": [
    "login",
    "logout",
    "grade_view",
    "attendance_check",
    "assignment_submit",
    "message_send"
  ],
  "heatmap_tracking": true,
  "session_recording": false
}' "9. Update Analytics Configuration"

# 10. Update legal documents
api_call "PUT" "/white-labeling/legal-documents" '{
  "terms_of_service": "These Terms of Service govern your use of the Springfield High School Student Information System. By accessing or using our services, you agree to be bound by these terms...",
  "privacy_policy": "This Privacy Policy describes how Springfield High School collects, uses, and protects your personal information when you use our Student Information System..."
}' "10. Update Legal Documents"

# 11. Validate custom domain
api_call "POST" "/white-labeling/validate-domain" '{
  "domain": "portal.springfield.edu"
}' "11. Validate Custom Domain"

# 12. Get branding preview
api_call "GET" "/white-labeling/preview/$TENANT_ID" "" "12. Get Branding Preview"

# 13. Export configuration
echo -e "${YELLOW}13. Export Branding Configuration${NC}"
echo -e "Request: GET /white-labeling/export-config"
curl -H "Authorization: Bearer $JWT_TOKEN" \
    "$BASE_URL/white-labeling/export-config" \
    -o "branding-config-export.json"
echo -e "Configuration exported to: branding-config-export.json"
echo -e "\n${GREEN}---${NC}\n"

# 14. Reset to defaults (commented out to avoid accidental reset)
# api_call "POST" "/white-labeling/reset-to-defaults" "" "14. Reset to Defaults"

echo -e "${BLUE}=== White-Labeling API Test Examples Complete ===${NC}"
echo -e "${GREEN}All examples have been executed successfully!${NC}"
echo -e "\n${YELLOW}Note: Make sure to replace the following variables in this script:${NC}"
echo -e "- TENANT_ID: Your actual tenant UUID"
echo -e "- JWT_TOKEN: Your valid JWT token"
echo -e "- BASE_URL: Your API base URL"
echo -e "\n${YELLOW}Also ensure your API server is running and accessible.${NC}"
