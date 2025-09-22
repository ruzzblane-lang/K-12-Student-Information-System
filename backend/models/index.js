// Mock models for testing
// In a real application, these would be proper database models

class MockModel {
  constructor(data = {}) {
    Object.assign(this, data);
    this.id = data.id || Math.random().toString(36).substr(2, 9);
  }

  static async create(data) {
    return new MockModel(data);
  }

  static async findOne(options) {
    // Mock implementation
    return null;
  }

  static async findAll(options) {
    // Mock implementation
    return [];
  }

  static async findByPk(id) {
    // Mock implementation
    return null;
  }

  async save() {
    return this;
  }

  async destroy() {
    return true;
  }
}

// Mock User model
class User extends MockModel {
  constructor(data = {}) {
    super({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'admin',
      first_name: 'Test',
      last_name: 'User',
      ...data
    });
  }
}

// Mock Student model
class Student extends MockModel {
  constructor(data = {}) {
    super({
      user_id: 1,
      student_id: 'STU001',
      enrollment_date: new Date(),
      status: 'active',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+1234567890',
      ...data
    });
  }
}

// Mock database connection
const sequelize = {
  sync: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true)
};

module.exports = {
  User,
  Student,
  sequelize
};
