/**
 * COPPA Compliance Service
 * Implements Children's Online Privacy Protection Act requirements
 */

const { query } = require('../../config/database');

class COPPAService {
  constructor() {
    this.minAge = 13;
  }

  async verifyParentalConsent(childId, consentMethod) {
    const queryText = `
      INSERT INTO coppa_parental_consent (
        child_id, consent_method, verified_at, status
      ) VALUES ($1, $2, NOW(), 'verified')
    `;
    
    await query(queryText, [childId, consentMethod]);
    return true;
  }

  async verifyChildAge(birthDate) {
    const age = this.calculateAge(birthDate);
    return age < this.minAge;
  }

  async deleteChildData(childId) {
    // Delete all data for child under 13
    const tables = ['students', 'grades', 'attendance', 'behavior_records'];
    
    for (const table of tables) {
      await query(`DELETE FROM ${table} WHERE id = $1`, [childId]);
    }
  }

  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  async getParentalConsentStatus(childId) {
    const queryText = `
      SELECT * FROM coppa_parental_consent
      WHERE child_id = $1 AND status = 'verified'
    `;
    
    const result = await query(queryText, [childId]);
    return result.rows.length > 0;
  }
}

module.exports = COPPAService;
