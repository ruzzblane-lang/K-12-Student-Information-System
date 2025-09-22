const { Tenant, User, Student, Teacher } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

class TenantService {
  /**
   * Create a new tenant (school)
   */
  async createTenant(tenantData, createdBy) {
    try {
      // Generate unique slug if not provided
      if (!tenantData.slug) {
        tenantData.slug = this.generateSlug(tenantData.schoolName);
      }

      // Ensure slug is unique
      tenantData.slug = await this.ensureUniqueSlug(tenantData.slug);

      // Set default features based on subscription plan
      tenantData.features = this.getDefaultFeatures(tenantData.subscriptionPlan);

      const tenant = await Tenant.create({
        ...tenantData,
        createdBy
      });

      return tenant;
    } catch (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId) {
    try {
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return tenant;
    } catch (error) {
      throw new Error(`Failed to get tenant: ${error.message}`);
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug) {
    try {
      const tenant = await Tenant.findBySlug(slug);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return tenant;
    } catch (error) {
      throw new Error(`Failed to get tenant: ${error.message}`);
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain) {
    try {
      const tenant = await Tenant.findByDomain(domain);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return tenant;
    } catch (error) {
      throw new Error(`Failed to get tenant: ${error.message}`);
    }
  }

  /**
   * Get tenant by subdomain
   */
  async getTenantBySubdomain(subdomain) {
    try {
      const tenant = await Tenant.findBySubdomain(subdomain);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return tenant;
    } catch (error) {
      throw new Error(`Failed to get tenant: ${error.message}`);
    }
  }

  /**
   * Update tenant information
   */
  async updateTenant(tenantId, updateData, updatedBy) {
    try {
      const tenant = await this.getTenantById(tenantId);
      
      // If updating slug, ensure it's unique
      if (updateData.slug && updateData.slug !== tenant.slug) {
        updateData.slug = await this.ensureUniqueSlug(updateData.slug, tenantId);
      }

      await tenant.update(updateData);
      return tenant;
    } catch (error) {
      throw new Error(`Failed to update tenant: ${error.message}`);
    }
  }

  /**
   * Get all active tenants
   */
  async getActiveTenants() {
    try {
      return await Tenant.findActiveTenants();
    } catch (error) {
      throw new Error(`Failed to get active tenants: ${error.message}`);
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId) {
    try {
      const [userCount, studentCount, teacherCount] = await Promise.all([
        User.count({ where: { tenantId, status: 'active' } }),
        Student.count({ where: { tenantId, status: 'active' } }),
        Teacher.count({ where: { tenantId, employmentStatus: 'active' } })
      ]);

      return {
        users: userCount,
        students: studentCount,
        teachers: teacherCount,
        utilization: {
          students: studentCount,
          teachers: teacherCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get tenant stats: ${error.message}`);
    }
  }

  /**
   * Check if tenant can add more students
   */
  async canAddStudents(tenantId, count = 1) {
    try {
      const tenant = await this.getTenantById(tenantId);
      const currentCount = await Student.count({ 
        where: { 
          tenantId, 
          status: 'active' 
        } 
      });
      
      return (currentCount + count) <= tenant.maxStudents;
    } catch (error) {
      throw new Error(`Failed to check student capacity: ${error.message}`);
    }
  }

  /**
   * Check if tenant can add more teachers
   */
  async canAddTeachers(tenantId, count = 1) {
    try {
      const tenant = await this.getTenantById(tenantId);
      const currentCount = await Teacher.count({ 
        where: { 
          tenantId, 
          employmentStatus: 'active' 
        } 
      });
      
      return (currentCount + count) <= tenant.maxTeachers;
    } catch (error) {
      throw new Error(`Failed to check teacher capacity: ${error.message}`);
    }
  }

  /**
   * Update tenant subscription
   */
  async updateSubscription(tenantId, subscriptionData) {
    try {
      const tenant = await this.getTenantById(tenantId);
      
      const updateData = {
        subscriptionPlan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.status,
        maxStudents: subscriptionData.maxStudents || tenant.maxStudents,
        maxTeachers: subscriptionData.maxTeachers || tenant.maxTeachers,
        features: this.getDefaultFeatures(subscriptionData.plan)
      };

      await tenant.update(updateData);
      return tenant;
    } catch (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason) {
    try {
      const tenant = await this.getTenantById(tenantId);
      await tenant.update({ 
        subscriptionStatus: 'suspended',
        features: {
          ...tenant.features,
          suspensionReason: reason,
          suspendedAt: new Date().toISOString()
        }
      });
      return tenant;
    } catch (error) {
      throw new Error(`Failed to suspend tenant: ${error.message}`);
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      const features = { ...tenant.features };
      delete features.suspensionReason;
      delete features.suspendedAt;
      
      await tenant.update({ 
        subscriptionStatus: 'active',
        features
      });
      return tenant;
    } catch (error) {
      throw new Error(`Failed to reactivate tenant: ${error.message}`);
    }
  }

  /**
   * Delete tenant (soft delete by suspending)
   */
  async deleteTenant(tenantId) {
    try {
      const tenant = await this.getTenantById(tenantId);
      await tenant.update({ 
        subscriptionStatus: 'cancelled',
        features: {
          ...tenant.features,
          deletedAt: new Date().toISOString()
        }
      });
      return tenant;
    } catch (error) {
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  /**
   * Generate a URL-friendly slug from school name
   */
  generateSlug(schoolName) {
    return schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Ensure slug is unique
   */
  async ensureUniqueSlug(slug, excludeTenantId = null) {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const whereClause = { slug: uniqueSlug };
      if (excludeTenantId) {
        whereClause.id = { [Op.ne]: excludeTenantId };
      }

      const existing = await Tenant.findOne({ where: whereClause });
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Get default features for subscription plan
   */
  getDefaultFeatures(plan) {
    const featureMap = {
      basic: {
        maxStudents: 500,
        maxTeachers: 50,
        customBranding: false,
        apiAccess: false,
        advancedReporting: false,
        integrations: false,
        prioritySupport: false,
        whiteLabel: false
      },
      professional: {
        maxStudents: 2000,
        maxTeachers: 200,
        customBranding: true,
        apiAccess: true,
        advancedReporting: true,
        integrations: true,
        prioritySupport: true,
        whiteLabel: false
      },
      enterprise: {
        maxStudents: 10000,
        maxTeachers: 1000,
        customBranding: true,
        apiAccess: true,
        advancedReporting: true,
        integrations: true,
        prioritySupport: true,
        whiteLabel: true,
        customDomain: true,
        sso: true,
        auditLogs: true
      }
    };

    return featureMap[plan] || featureMap.basic;
  }

  /**
   * Validate tenant data
   */
  validateTenantData(data) {
    const errors = [];

    if (!data.schoolName) {
      errors.push('School name is required');
    }

    if (!data.schoolType) {
      errors.push('School type is required');
    }

    if (!data.schoolLevel) {
      errors.push('School level is required');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.website && !this.isValidUrl(data.website)) {
      errors.push('Invalid website URL');
    }

    if (data.primaryColor && !this.isValidHexColor(data.primaryColor)) {
      errors.push('Invalid primary color format');
    }

    if (data.secondaryColor && !this.isValidHexColor(data.secondaryColor)) {
      errors.push('Invalid secondary color format');
    }

    return errors;
  }

  /**
   * Helper methods for validation
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
  }
}

module.exports = new TenantService();
