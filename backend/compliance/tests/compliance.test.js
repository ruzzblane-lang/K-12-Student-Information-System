/**
 * Compliance Test Suite
 * Tests all compliance features and requirements
 */

const { expect } = require('chai');
const ComplianceEngine = require('../services/ComplianceEngine');
const DataTokenizationService = require('../services/DataTokenizationService');
const EncryptionVault = require('../services/EncryptionVault');
const AuditTrailService = require('../services/AuditTrailService');
const DataResidencyService = require('../services/DataResidencyService');
const KYCAMLService = require('../services/KYCAMLService');
const PCIDSSService = require('../services/PCIDSSService');

describe('Compliance Framework Tests', () => {
  let complianceEngine;
  let tokenizationService;
  let encryptionVault;
  let auditTrailService;
  let dataResidencyService;
  let kycamlService;
  let pciDSSService;

  before(() => {
    complianceEngine = new ComplianceEngine();
    tokenizationService = new DataTokenizationService();
    encryptionVault = new EncryptionVault();
    auditTrailService = new AuditTrailService();
    dataResidencyService = new DataResidencyService();
    kycamlService = new KYCAMLService();
    pciDSSService = new PCIDSSService();
  });

  describe('Data Tokenization', () => {
    it('should tokenize sensitive data', async () => {
      const testData = '4111111111111111';
      const dataType = 'card_number';
      const tenantId = 'test-tenant';

      const result = await tokenizationService.tokenize(testData, dataType, tenantId);
      
      expect(result).to.have.property('token');
      expect(result.token).to.match(/^tok_/);
      expect(result.dataType).to.equal(dataType);
      expect(result.tenantId).to.equal(tenantId);
    });

    it('should detokenize data correctly', async () => {
      const testData = '4111111111111111';
      const dataType = 'card_number';
      const tenantId = 'test-tenant';

      const tokenizeResult = await tokenizationService.tokenize(testData, dataType, tenantId);
      const detokenizeResult = await tokenizationService.detokenize(tokenizeResult.token, tenantId);
      
      expect(detokenizeResult).to.equal(testData);
    });
  });

  describe('Encryption Vault', () => {
    it('should store and retrieve encrypted data', async () => {
      const testData = { sensitive: 'data', number: 12345 };
      const key = 'test-key';
      const tenantId = 'test-tenant';

      const storeResult = await encryptionVault.store(key, testData, tenantId);
      const retrieveResult = await encryptionVault.retrieve(key, tenantId);
      
      expect(storeResult).to.have.property('vaultId');
      expect(retrieveResult.data).to.deep.equal(testData);
    });
  });

  describe('Audit Trail', () => {
    it('should log audit events', async () => {
      const eventData = {
        tenantId: 'test-tenant',
        userId: 'test-user',
        action: 'test_action',
        resourceType: 'test_resource',
        resourceId: 'test-id'
      };

      const result = await auditTrailService.logEvent(eventData);
      
      expect(result).to.have.property('auditId');
      expect(result).to.have.property('integrityHash');
      expect(result).to.have.property('chainHash');
    });

    it('should verify audit trail integrity', async () => {
      const tenantId = 'test-tenant';
      
      const result = await auditTrailService.verifyIntegrity(tenantId);
      
      expect(result).to.have.property('valid');
      expect(result).to.have.property('totalLogs');
    });
  });

  describe('Data Residency', () => {
    it('should validate data residency', async () => {
      const tenantId = 'test-tenant';
      const dataType = 'personal_data';
      const targetRegion = 'US';

      const result = await dataResidencyService.validateDataResidency(tenantId, dataType, targetRegion);
      
      expect(result).to.have.property('valid');
      expect(result).to.have.property('tenantId');
      expect(result).to.have.property('dataType');
      expect(result).to.have.property('targetRegion');
    });
  });

  describe('KYC/AML', () => {
    it('should perform KYC verification', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
        phoneNumber: '+1234567890',
        email: 'john.doe@example.com'
      };
      const tenantId = 'test-tenant';

      const result = await kycamlService.performKYCVerification(userData, tenantId);
      
      expect(result).to.have.property('sessionId');
      expect(result).to.have.property('riskScore');
      expect(result).to.have.property('riskLevel');
      expect(result).to.have.property('overallStatus');
    });

    it('should perform AML screening', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        address: '123 Main St'
      };
      const tenantId = 'test-tenant';

      const result = await kycamlService.performAMLScreening(userData, tenantId);
      
      expect(result).to.have.property('sessionId');
      expect(result).to.have.property('amlRiskScore');
      expect(result).to.have.property('amlRiskLevel');
      expect(result).to.have.property('screeningStatus');
    });
  });

  describe('PCI DSS', () => {
    it('should create hosted payment form', async () => {
      const provider = 'stripe';
      const options = { theme: 'default' };

      const result = await pciDSSService.createHostedPaymentForm(provider, options);
      
      expect(result).to.have.property('formId');
      expect(result).to.have.property('provider');
      expect(result).to.have.property('configuration');
      expect(result).to.have.property('security');
      expect(result).to.have.property('compliance');
    });

    it('should validate PCI DSS requirements', async () => {
      const paymentData = {
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'card'
      };
      const tenantId = 'test-tenant';

      const result = await pciDSSService.validatePCIRequirements(paymentData, tenantId);
      
      expect(result).to.have.property('valid');
      expect(result).to.have.property('requirements');
    });
  });

  describe('Compliance Engine', () => {
    it('should check GDPR compliance', async () => {
      const tenantId = 'test-tenant';
      const context = { userId: 'test-user' };

      const result = await complianceEngine.checkCompliance('GDPR', tenantId, context);
      
      expect(result).to.have.property('standard');
      expect(result).to.have.property('tenantId');
      expect(result).to.have.property('overallCompliance');
      expect(result).to.have.property('requirements');
    });

    it('should process sensitive data with compliance', async () => {
      const data = { ssn: '123-45-6789' };
      const dataType = 'ssn';
      const tenantId = 'test-tenant';
      const context = { userId: 'test-user' };

      const result = await complianceEngine.processSensitiveData(data, dataType, tenantId, context);
      
      expect(result).to.have.property('tenantId');
      expect(result).to.have.property('dataType');
      expect(result).to.have.property('steps');
      expect(result).to.have.property('finalResult');
    });
  });
});
