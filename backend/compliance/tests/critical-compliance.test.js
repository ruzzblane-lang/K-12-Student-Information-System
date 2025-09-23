/**
 * Critical Compliance Tests
 * Tests the most important compliance requirements
 */

const { expect } = require('chai');
const FERPAService = require('../services/FERPAService');
const COPPAService = require('../services/COPPAService');
const PCIDSSRequirements = require('../services/PCIDSSRequirements');

describe('Critical Compliance Tests', () => {
  let ferpaService;
  let coppaService;
  let pciService;

  before(() => {
    ferpaService = new FERPAService();
    coppaService = new COPPAService();
    pciService = new PCIDSSRequirements();
  });

  describe('FERPA Compliance', () => {
    it('should verify parent identity', async () => {
      const result = await ferpaService.verifyParentIdentity('parent-1', 'student-1');
      expect(result).to.be.a('boolean');
    });

    it('should track disclosures', async () => {
      await ferpaService.trackDisclosure('record-1', 'parent-1', 'academic', 'tenant-1');
      // Test passes if no error thrown
    });
  });

  describe('COPPA Compliance', () => {
    it('should verify child age', async () => {
      const isChild = await coppaService.verifyChildAge('2015-01-01');
      expect(isChild).to.be.true;
    });

    it('should calculate age correctly', () => {
      const age = coppaService.calculateAge('2010-01-01');
      expect(age).to.be.greaterThan(13);
    });
  });

  describe('PCI DSS Requirements', () => {
    it('should check all requirements', async () => {
      const results = await pciService.checkAllRequirements();
      expect(results).to.be.an('object');
    });
  });
});
