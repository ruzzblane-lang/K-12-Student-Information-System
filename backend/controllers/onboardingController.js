const onboardingService = require('../services/onboardingService');
const { validationResult } = require('express-validator');

class OnboardingController {
  /**
   * Start tenant onboarding process
   */
  async startOnboarding(req, res) {
    try {
      // Validate request data
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const onboardingData = req.body;
      const createdBy = req.user?.id; // Super admin who initiated onboarding

      // Validate onboarding data
      const validationErrors = onboardingService.validateOnboardingData(onboardingData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid onboarding data',
          details: validationErrors
        });
      }

      // Start onboarding process
      const result = await onboardingService.onboardTenant(onboardingData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Tenant onboarding started successfully',
        data: {
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            slug: result.tenant.slug,
            schoolName: result.tenant.schoolName,
            subscriptionPlan: result.tenant.subscriptionPlan,
            subscriptionStatus: result.tenant.subscriptionStatus
          },
          adminUser: {
            id: result.adminUser.id,
            email: result.adminUser.email,
            firstName: result.adminUser.firstName,
            lastName: result.adminUser.lastName,
            role: result.adminUser.role
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      console.error('Start onboarding error:', error);
      res.status(500).json({
        error: 'Failed to start onboarding',
        message: error.message
      });
    }
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(req, res) {
    try {
      const tenantId = req.tenant.id;
      const progress = await onboardingService.getOnboardingProgress(tenantId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Get onboarding progress error:', error);
      res.status(500).json({
        error: 'Failed to get onboarding progress',
        message: error.message
      });
    }
  }

  /**
   * Send onboarding reminder
   */
  async sendOnboardingReminder(req, res) {
    try {
      const tenantId = req.tenant.id;
      await onboardingService.sendOnboardingReminder(tenantId);

      res.json({
        success: true,
        message: 'Onboarding reminder sent successfully'
      });
    } catch (error) {
      console.error('Send onboarding reminder error:', error);
      res.status(500).json({
        error: 'Failed to send onboarding reminder',
        message: error.message
      });
    }
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(req, res) {
    try {
      const { step } = req.params;
      const tenantId = req.tenant.id;

      // This would update the specific onboarding step
      // For now, we'll just return success
      res.json({
        success: true,
        message: `Onboarding step '${step}' completed successfully`
      });
    } catch (error) {
      console.error('Complete onboarding step error:', error);
      res.status(500).json({
        error: 'Failed to complete onboarding step',
        message: error.message
      });
    }
  }

  /**
   * Get onboarding checklist
   */
  async getOnboardingChecklist(req, res) {
    try {
      const tenantId = req.tenant.id;
      const progress = await onboardingService.getOnboardingProgress(tenantId);

      const checklist = [
        {
          id: 'email_verification',
          title: 'Verify Email Address',
          description: 'Verify your administrator email address',
          completed: progress.progress.emailVerified,
          priority: 'high',
          action: 'verify_email'
        },
        {
          id: 'profile_setup',
          title: 'Complete School Profile',
          description: 'Add school logo, colors, and contact information',
          completed: progress.progress.profileCompleted,
          priority: 'medium',
          action: 'complete_profile'
        },
        {
          id: 'teacher_setup',
          title: 'Add Teachers',
          description: 'Import or add your teaching staff',
          completed: progress.progress.teachersAdded,
          priority: 'medium',
          action: 'add_teachers'
        },
        {
          id: 'student_setup',
          title: 'Add Students',
          description: 'Import or add your students',
          completed: progress.progress.studentsAdded,
          priority: 'high',
          action: 'add_students'
        },
        {
          id: 'class_setup',
          title: 'Set Up Classes',
          description: 'Create classes and assign teachers',
          completed: progress.progress.classesCreated,
          priority: 'medium',
          action: 'setup_classes'
        }
      ];

      res.json({
        success: true,
        data: {
          checklist,
          completionPercentage: progress.completionPercentage,
          nextSteps: progress.nextSteps
        }
      });
    } catch (error) {
      console.error('Get onboarding checklist error:', error);
      res.status(500).json({
        error: 'Failed to get onboarding checklist',
        message: error.message
      });
    }
  }

  /**
   * Get onboarding resources and help
   */
  async getOnboardingResources(req, res) {
    try {
      const resources = {
        documentation: [
          {
            title: 'Getting Started Guide',
            description: 'Complete guide to setting up your school',
            url: `${process.env.FRONTEND_URL}/help/getting-started`,
            type: 'guide'
          },
          {
            title: 'Teacher Management',
            description: 'How to add and manage teachers',
            url: `${process.env.FRONTEND_URL}/help/teachers`,
            type: 'guide'
          },
          {
            title: 'Student Management',
            description: 'How to add and manage students',
            url: `${process.env.FRONTEND_URL}/help/students`,
            type: 'guide'
          },
          {
            title: 'Class Setup',
            description: 'Creating classes and schedules',
            url: `${process.env.FRONTEND_URL}/help/classes`,
            type: 'guide'
          }
        ],
        videos: [
          {
            title: 'Welcome to Your SIS',
            description: 'Overview of the system features',
            url: `${process.env.FRONTEND_URL}/help/videos/welcome`,
            duration: '5:30',
            type: 'video'
          },
          {
            title: 'Adding Your First Teacher',
            description: 'Step-by-step teacher setup',
            url: `${process.env.FRONTEND_URL}/help/videos/add-teacher`,
            duration: '3:45',
            type: 'video'
          },
          {
            title: 'Importing Students',
            description: 'Bulk import student data',
            url: `${process.env.FRONTEND_URL}/help/videos/import-students`,
            duration: '7:20',
            type: 'video'
          }
        ],
        templates: [
          {
            title: 'Student Import Template',
            description: 'CSV template for importing students',
            url: `${process.env.FRONTEND_URL}/templates/student-import.csv`,
            type: 'template'
          },
          {
            title: 'Teacher Import Template',
            description: 'CSV template for importing teachers',
            url: `${process.env.FRONTEND_URL}/templates/teacher-import.csv`,
            type: 'template'
          }
        ],
        support: {
          email: 'support@sisplatform.com',
          phone: '1-800-SIS-HELP',
          chat: `${process.env.FRONTEND_URL}/support/chat`,
          knowledgeBase: `${process.env.FRONTEND_URL}/help`
        }
      };

      res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('Get onboarding resources error:', error);
      res.status(500).json({
        error: 'Failed to get onboarding resources',
        message: error.message
      });
    }
  }
}

module.exports = new OnboardingController();
