const tenantService = require('./tenantService');
const { User, Tenant, Student, Teacher } = require('../models');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class OnboardingService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
  }

  /**
   * Create email transporter for onboarding emails
   */
  createEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  /**
   * Complete tenant onboarding process
   */
  async onboardTenant(onboardingData, createdBy) {
    try {
      // Step 1: Create tenant
      const tenant = await tenantService.createTenant(onboardingData.tenant, createdBy);

      // Step 2: Create admin user
      const adminUser = await this.createAdminUser(tenant.id, onboardingData.admin);

      // Step 3: Send welcome email
      await this.sendWelcomeEmail(adminUser, tenant);

      // Step 4: Create initial setup tasks
      await this.createSetupTasks(tenant.id);

      return {
        tenant,
        adminUser,
        accessToken: generateToken(adminUser),
        refreshToken: generateRefreshToken(adminUser)
      };
    } catch (error) {
      throw new Error(`Onboarding failed: ${error.message}`);
    }
  }

  /**
   * Create admin user for new tenant
   */
  async createAdminUser(tenantId, adminData) {
    try {
      const adminUser = await User.create({
        tenantId,
        email: adminData.email,
        passwordHash: adminData.password, // Will be hashed by model hook
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'admin',
        status: 'active',
        emailVerified: false,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        createdBy: null // First user in tenant
      });

      return adminUser;
    } catch (error) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }
  }

  /**
   * Send welcome email to admin user
   */
  async sendWelcomeEmail(user, tenant) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`;
      const loginUrl = `${process.env.FRONTEND_URL}/login?tenant=${tenant.slug}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@sisplatform.com',
        to: user.email,
        subject: `Welcome to ${tenant.schoolName} - Student Information System`,
        html: this.generateWelcomeEmailHTML(user, tenant, verificationUrl, loginUrl)
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error - onboarding should continue even if email fails
    }
  }

  /**
   * Generate welcome email HTML
   */
  generateWelcomeEmailHTML(user, tenant, verificationUrl, loginUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ${tenant.schoolName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${tenant.primaryColor || '#007bff'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: ${tenant.primaryColor || '#007bff'}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${tenant.schoolName}</h1>
            <p>Student Information System</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Welcome to your new Student Information System! Your school account has been successfully created.</p>
            
            <h3>Your Account Details:</h3>
            <ul>
              <li><strong>School:</strong> ${tenant.schoolName}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Role:</strong> Administrator</li>
              <li><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
            </ul>

            <h3>Next Steps:</h3>
            <ol>
              <li>Verify your email address by clicking the button below</li>
              <li>Log in to your account</li>
              <li>Complete your school setup</li>
              <li>Add teachers and students</li>
            </ol>

            <p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>

            <p>
              <a href="${loginUrl}" class="button">Login to Your Account</a>
            </p>

            <h3>Getting Started Guide:</h3>
            <p>Check out our comprehensive setup guide to help you get started:</p>
            <ul>
              <li><a href="${process.env.FRONTEND_URL}/help/setup">Initial Setup Guide</a></li>
              <li><a href="${process.env.FRONTEND_URL}/help/teachers">Adding Teachers</a></li>
              <li><a href="${process.env.FRONTEND_URL}/help/students">Adding Students</a></li>
              <li><a href="${process.env.FRONTEND_URL}/help/classes">Setting Up Classes</a></li>
            </ul>

            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${user.email} for ${tenant.schoolName}</p>
            <p>© ${new Date().getFullYear()} Student Information System Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create initial setup tasks for new tenant
   */
  async createSetupTasks(tenantId) {
    try {
      const tasks = [
        {
          tenantId,
          title: 'Verify Email Address',
          description: 'Verify your administrator email address',
          type: 'email_verification',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        {
          tenantId,
          title: 'Complete School Profile',
          description: 'Add school logo, colors, and contact information',
          type: 'profile_setup',
          priority: 'medium',
          status: 'pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        {
          tenantId,
          title: 'Add Teachers',
          description: 'Add your teaching staff to the system',
          type: 'teacher_setup',
          priority: 'medium',
          status: 'pending',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        },
        {
          tenantId,
          title: 'Import Students',
          description: 'Add students to the system',
          type: 'student_setup',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        },
        {
          tenantId,
          title: 'Set Up Classes',
          description: 'Create classes and assign teachers',
          type: 'class_setup',
          priority: 'medium',
          status: 'pending',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
        }
      ];

      // This would create tasks in a tasks table
      // For now, we'll just log them
      console.log('Setup tasks created for tenant:', tenantId, tasks);
    } catch (error) {
      console.error('Failed to create setup tasks:', error);
    }
  }

  /**
   * Get onboarding progress for tenant
   */
  async getOnboardingProgress(tenantId) {
    try {
      const tenant = await tenantService.getTenantById(tenantId);
      
      // Check various onboarding milestones
      const progress = {
        tenantCreated: true,
        adminUserCreated: false,
        emailVerified: false,
        profileCompleted: false,
        teachersAdded: false,
        studentsAdded: false,
        classesCreated: false
      };

      // Check admin user
      const adminUser = await User.findOne({
        where: { tenantId, role: 'admin' }
      });
      progress.adminUserCreated = !!adminUser;

      if (adminUser) {
        progress.emailVerified = adminUser.emailVerified;
      }

      // Check profile completion
      progress.profileCompleted = !!(
        tenant.logoUrl &&
        tenant.primaryColor &&
        tenant.phone &&
        tenant.email
      );

      // Check teachers
      const teacherCount = await Teacher.count({
        where: { tenantId, employmentStatus: 'active' }
      });
      progress.teachersAdded = teacherCount > 0;

      // Check students
      const studentCount = await Student.count({
        where: { tenantId, status: 'active' }
      });
      progress.studentsAdded = studentCount > 0;

      // Check classes
      const classCount = await req.db.models.Class.count({
        where: { tenantId, status: 'active' }
      });
      progress.classesCreated = classCount > 0;

      // Calculate completion percentage
      const completedSteps = Object.values(progress).filter(Boolean).length;
      const totalSteps = Object.keys(progress).length;
      const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

      return {
        progress,
        completionPercentage,
        nextSteps: this.getNextSteps(progress)
      };
    } catch (error) {
      throw new Error(`Failed to get onboarding progress: ${error.message}`);
    }
  }

  /**
   * Get next steps for onboarding
   */
  getNextSteps(progress) {
    const nextSteps = [];

    if (!progress.adminUserCreated) {
      nextSteps.push({
        title: 'Create Admin User',
        description: 'Set up your administrator account',
        priority: 'high',
        action: 'create_admin'
      });
    } else if (!progress.emailVerified) {
      nextSteps.push({
        title: 'Verify Email Address',
        description: 'Check your email and verify your account',
        priority: 'high',
        action: 'verify_email'
      });
    } else if (!progress.profileCompleted) {
      nextSteps.push({
        title: 'Complete School Profile',
        description: 'Add your school logo, colors, and contact information',
        priority: 'medium',
        action: 'complete_profile'
      });
    } else if (!progress.teachersAdded) {
      nextSteps.push({
        title: 'Add Teachers',
        description: 'Import or add your teaching staff',
        priority: 'medium',
        action: 'add_teachers'
      });
    } else if (!progress.studentsAdded) {
      nextSteps.push({
        title: 'Add Students',
        description: 'Import or add your students',
        priority: 'high',
        action: 'add_students'
      });
    } else if (!progress.classesCreated) {
      nextSteps.push({
        title: 'Set Up Classes',
        description: 'Create classes and assign teachers',
        priority: 'medium',
        action: 'setup_classes'
      });
    } else {
      nextSteps.push({
        title: 'Onboarding Complete!',
        description: 'Your school is ready to use the system',
        priority: 'low',
        action: 'complete'
      });
    }

    return nextSteps;
  }

  /**
   * Send onboarding reminder email
   */
  async sendOnboardingReminder(tenantId) {
    try {
      const tenant = await tenantService.getTenantById(tenantId);
      const adminUser = await User.findOne({
        where: { tenantId, role: 'admin' }
      });

      if (!adminUser) {
        throw new Error('Admin user not found');
      }

      const progress = await this.getOnboardingProgress(tenantId);
      const nextSteps = progress.nextSteps;

      if (nextSteps.length === 0 || nextSteps[0].action === 'complete') {
        return; // Onboarding is complete
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@sisplatform.com',
        to: adminUser.email,
        subject: `Complete Your ${tenant.schoolName} Setup - ${progress.completionPercentage}% Complete`,
        html: this.generateReminderEmailHTML(adminUser, tenant, progress, nextSteps)
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send onboarding reminder:', error);
    }
  }

  /**
   * Generate reminder email HTML
   */
  generateReminderEmailHTML(user, tenant, progress, nextSteps) {
    const loginUrl = `${process.env.FRONTEND_URL}/login?tenant=${tenant.slug}`;
    const nextStep = nextSteps[0];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Complete Your Setup - ${tenant.schoolName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${tenant.primaryColor || '#007bff'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; margin: 20px 0; }
          .progress-fill { background: ${tenant.primaryColor || '#007bff'}; height: 100%; border-radius: 10px; width: ${progress.completionPercentage}%; }
          .button { display: inline-block; padding: 12px 24px; background: ${tenant.primaryColor || '#007bff'}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Complete Your Setup</h1>
            <p>${tenant.schoolName} - Student Information System</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>You're making great progress setting up your Student Information System!</p>
            
            <h3>Setup Progress: ${progress.completionPercentage}%</h3>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>

            <h3>Next Step: ${nextStep.title}</h3>
            <p>${nextStep.description}</p>

            <p>
              <a href="${loginUrl}" class="button">Continue Setup</a>
            </p>

            <h3>Remaining Steps:</h3>
            <ul>
              ${nextSteps.map(step => `<li><strong>${step.title}:</strong> ${step.description}</li>`).join('')}
            </ul>

            <p>Need help? Check out our <a href="${process.env.FRONTEND_URL}/help">help center</a> or contact support.</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${user.email} for ${tenant.schoolName}</p>
            <p>© ${new Date().getFullYear()} Student Information System Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate onboarding data
   */
  validateOnboardingData(data) {
    const errors = [];

    // Validate tenant data
    if (!data.tenant) {
      errors.push('Tenant data is required');
    } else {
      const tenantErrors = tenantService.validateTenantData(data.tenant);
      errors.push(...tenantErrors);
    }

    // Validate admin user data
    if (!data.admin) {
      errors.push('Admin user data is required');
    } else {
      if (!data.admin.email) {
        errors.push('Admin email is required');
      }
      if (!data.admin.password) {
        errors.push('Admin password is required');
      }
      if (!data.admin.firstName) {
        errors.push('Admin first name is required');
      }
      if (!data.admin.lastName) {
        errors.push('Admin last name is required');
      }
    }

    return errors;
  }
}

module.exports = new OnboardingService();
