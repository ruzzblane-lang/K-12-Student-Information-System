/**
 * White-Label Payment Service
 * 
 * Provides branded payment flows per school/district with custom
 * styling, logos, and payment method configurations.
 */

const { v4: uuidv4 } = require('uuid');

class WhiteLabelPaymentService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Apply white-label branding to payment data
   * @param {Object} paymentData - Payment data
   * @param {Object} tenantConfig - Tenant configuration
   * @returns {Object} Branded payment data
   */
  async applyBranding(paymentData, tenantConfig) {
    try {
      // Get tenant branding configuration
      const branding = await this.getTenantBranding(paymentData.tenantId);
      
      // Apply branding to payment data
      const brandedPaymentData = {
        ...paymentData,
        branding: {
          logo: branding.logo_url,
          primaryColor: branding.primary_color,
          secondaryColor: branding.secondary_color,
          fontFamily: branding.font_family,
          customCss: branding.custom_css,
          schoolName: branding.school_name,
          domain: branding.domain
        },
        whiteLabelConfig: {
          enabled: true,
          level: tenantConfig.whiteLabelLevel || 'basic',
          customDomain: branding.domain,
          sslEnabled: branding.ssl_certificate_status === 'active'
        }
      };

      // Add payment method restrictions based on tenant config
      if (tenantConfig.allowedPaymentMethods) {
        brandedPaymentData.allowedPaymentMethods = tenantConfig.allowedPaymentMethods;
      }

      // Add currency preferences
      if (tenantConfig.preferredCurrencies) {
        brandedPaymentData.preferredCurrencies = tenantConfig.preferredCurrencies;
      }

      return brandedPaymentData;

    } catch (error) {
      console.error('Failed to apply branding:', error);
      return paymentData; // Return original data if branding fails
    }
  }

  /**
   * Create branded payment flow
   * @param {Object} flowConfig - Flow configuration
   * @returns {Object} Branded payment flow
   */
  async createPaymentFlow(flowConfig) {
    const flowId = uuidv4();
    
    try {
      const { tenantId, branding, paymentConfig } = flowConfig;

      // Get tenant branding
      const tenantBranding = await this.getTenantBranding(tenantId);

      // Create payment flow configuration
      const flow = {
        id: flowId,
        tenantId,
        branding: {
          logo: branding?.logo || tenantBranding.logo_url,
          primaryColor: branding?.primaryColor || tenantBranding.primary_color,
          secondaryColor: branding?.secondaryColor || tenantBranding.secondary_color,
          fontFamily: branding?.fontFamily || tenantBranding.font_family,
          customCss: branding?.customCss || tenantBranding.custom_css,
          schoolName: tenantBranding.school_name,
          domain: tenantBranding.domain
        },
        paymentConfig: {
          amount: paymentConfig.amount,
          currency: paymentConfig.currency,
          allowedPaymentMethods: paymentConfig.allowedPaymentMethods || ['card', 'paypal'],
          description: paymentConfig.description || `Payment for ${tenantBranding.school_name}`,
          successUrl: paymentConfig.successUrl,
          cancelUrl: paymentConfig.cancelUrl,
          webhookUrl: paymentConfig.webhookUrl
        },
        features: {
          savePaymentMethod: paymentConfig.savePaymentMethod || false,
          recurringPayments: paymentConfig.recurringPayments || false,
          installments: paymentConfig.installments || false,
          multiCurrency: paymentConfig.multiCurrency || false
        },
        security: {
          fraudDetection: paymentConfig.fraudDetection !== false,
          requireAuthentication: paymentConfig.requireAuthentication || false,
          allowedCountries: paymentConfig.allowedCountries || [],
          blockedCountries: paymentConfig.blockedCountries || []
        },
        createdAt: new Date()
      };

      // Store flow configuration
      await this.storePaymentFlow(flow);

      // Generate branded payment page HTML
      const paymentPageHtml = await this.generatePaymentPageHtml(flow);

      return {
        success: true,
        flowId,
        flow,
        paymentPageUrl: `${tenantBranding.domain || 'https://app.schoolsis.com'}/pay/${flowId}`,
        paymentPageHtml,
        embedCode: this.generateEmbedCode(flowId, tenantBranding.domain)
      };

    } catch (error) {
      throw new Error(`Failed to create payment flow: ${error.message}`);
    }
  }

  /**
   * Generate branded payment page HTML
   * @param {Object} flow - Payment flow configuration
   * @returns {string} HTML content
   */
  async generatePaymentPageHtml(flow) {
    const { branding, paymentConfig, features } = flow;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment - ${branding.schoolName}</title>
    <style>
        :root {
            --primary-color: ${branding.primaryColor || '#1e40af'};
            --secondary-color: ${branding.secondaryColor || '#3b82f6'};
            --font-family: ${branding.fontFamily || 'Inter, system-ui, sans-serif'};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--font-family);
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .payment-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            overflow: hidden;
        }
        
        .payment-header {
            background: var(--primary-color);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .logo img {
            width: 60px;
            height: 60px;
            object-fit: contain;
        }
        
        .school-name {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .payment-title {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .payment-body {
            padding: 40px 30px;
        }
        
        .amount-display {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .amount {
            font-size: 36px;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 8px;
        }
        
        .currency {
            font-size: 18px;
            color: #6b7280;
        }
        
        .payment-methods {
            margin-bottom: 30px;
        }
        
        .payment-method {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .payment-method:hover {
            border-color: var(--primary-color);
            background: #f8fafc;
        }
        
        .payment-method.selected {
            border-color: var(--primary-color);
            background: #eff6ff;
        }
        
        .payment-method-icon {
            width: 40px;
            height: 40px;
            background: var(--secondary-color);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .payment-method-info h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .payment-method-info p {
            font-size: 14px;
            color: #6b7280;
        }
        
        .payment-form {
            display: none;
        }
        
        .payment-form.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #374151;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .pay-button {
            width: 100%;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }
        
        .pay-button:hover {
            background: var(--secondary-color);
            transform: translateY(-2px);
        }
        
        .pay-button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }
        
        .security-badges {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .security-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #6b7280;
        }
        
        .security-badge-icon {
            width: 16px;
            height: 16px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
        }
        
        ${branding.customCss || ''}
    </style>
</head>
<body>
    <div class="payment-container">
        <div class="payment-header">
            <div class="logo">
                ${branding.logo ? `<img src="${branding.logo}" alt="${branding.schoolName}">` : branding.schoolName.charAt(0)}
            </div>
            <div class="school-name">${branding.schoolName}</div>
            <div class="payment-title">Secure Payment</div>
        </div>
        
        <div class="payment-body">
            <div class="amount-display">
                <div class="amount">$${paymentConfig.amount.toFixed(2)}</div>
                <div class="currency">${paymentConfig.currency}</div>
            </div>
            
            <div class="payment-methods">
                ${paymentConfig.allowedPaymentMethods.map(method => `
                    <div class="payment-method" data-method="${method}">
                        <div class="payment-method-icon">
                            ${this.getPaymentMethodIcon(method)}
                        </div>
                        <div class="payment-method-info">
                            <h3>${this.getPaymentMethodName(method)}</h3>
                            <p>${this.getPaymentMethodDescription(method)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="payment-form" id="card-form">
                <div class="form-group">
                    <label class="form-label">Card Number</label>
                    <input type="text" class="form-input" placeholder="1234 5678 9012 3456" maxlength="19">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Expiry Date</label>
                        <input type="text" class="form-input" placeholder="MM/YY" maxlength="5">
                    </div>
                    <div class="form-group">
                        <label class="form-label">CVC</label>
                        <input type="text" class="form-input" placeholder="123" maxlength="4">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Cardholder Name</label>
                    <input type="text" class="form-input" placeholder="John Doe">
                </div>
            </div>
            
            <button class="pay-button" onclick="processPayment()">
                Pay $${paymentConfig.amount.toFixed(2)}
            </button>
            
            <div class="security-badges">
                <div class="security-badge">
                    <div class="security-badge-icon">✓</div>
                    <span>SSL Secured</span>
                </div>
                <div class="security-badge">
                    <div class="security-badge-icon">✓</div>
                    <span>PCI Compliant</span>
                </div>
                <div class="security-badge">
                    <div class="security-badge-icon">✓</div>
                    <span>Fraud Protected</span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', function() {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                this.classList.add('selected');
                
                const methodType = this.dataset.method;
                document.getElementById('card-form').classList.toggle('active', methodType === 'card');
            });
        });
        
        // Card number formatting
        document.querySelector('input[placeholder="1234 5678 9012 3456"]').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
        
        // Expiry date formatting
        document.querySelector('input[placeholder="MM/YY"]').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
        
        // Process payment
        function processPayment() {
            const selectedMethod = document.querySelector('.payment-method.selected');
            if (!selectedMethod) {
                alert('Please select a payment method');
                return;
            }
            
            const button = document.querySelector('.pay-button');
            button.disabled = true;
            button.textContent = 'Processing...';
            
            // Simulate payment processing
            setTimeout(() => {
                alert('Payment processed successfully!');
                button.disabled = false;
                button.textContent = 'Pay $${paymentConfig.amount.toFixed(2)}';
            }, 2000);
        }
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate embed code for payment flow
   * @param {string} flowId - Flow ID
   * @param {string} domain - Tenant domain
   * @returns {string} Embed code
   */
  generateEmbedCode(flowId, domain) {
    const baseUrl = domain || 'https://app.schoolsis.com';
    
    return `
<!-- School SIS Payment Widget -->
<iframe 
    src="${baseUrl}/pay/${flowId}/embed" 
    width="100%" 
    height="600" 
    frameborder="0" 
    style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</iframe>
<script>
    // Auto-resize iframe based on content
    window.addEventListener('message', function(event) {
        if (event.data.type === 'resize') {
            document.querySelector('iframe').style.height = event.data.height + 'px';
        }
    });
</script>`;
  }

  /**
   * Get payment method icon
   * @param {string} method - Payment method
   * @returns {string} Icon HTML
   */
  getPaymentMethodIcon(method) {
    const icons = {
      'card': '💳',
      'paypal': 'P',
      'apple_pay': '🍎',
      'google_pay': 'G',
      'sepa_debit': '🏦',
      'ideal': 'I',
      'bancontact': 'B',
      'eps': 'E',
      'giropay': 'G',
      'sofort': 'S',
      'alipay': '支',
      'wechat_pay': '微',
      'upi': '₹',
      'netbanking': '🏦',
      'wallet': '👛'
    };
    
    return icons[method] || '💳';
  }

  /**
   * Get payment method name
   * @param {string} method - Payment method
   * @returns {string} Display name
   */
  getPaymentMethodName(method) {
    const names = {
      'card': 'Credit/Debit Card',
      'paypal': 'PayPal',
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'sepa_debit': 'SEPA Direct Debit',
      'ideal': 'iDEAL',
      'bancontact': 'Bancontact',
      'eps': 'EPS',
      'giropay': 'Giropay',
      'sofort': 'Sofort',
      'alipay': 'Alipay',
      'wechat_pay': 'WeChat Pay',
      'upi': 'UPI',
      'netbanking': 'Net Banking',
      'wallet': 'Digital Wallet'
    };
    
    return names[method] || method;
  }

  /**
   * Get payment method description
   * @param {string} method - Payment method
   * @returns {string} Description
   */
  getPaymentMethodDescription(method) {
    const descriptions = {
      'card': 'Visa, Mastercard, American Express',
      'paypal': 'Pay with your PayPal account',
      'apple_pay': 'Pay with Touch ID or Face ID',
      'google_pay': 'Pay with your Google account',
      'sepa_debit': 'Direct bank transfer (EU)',
      'ideal': 'Dutch online banking',
      'bancontact': 'Belgian online banking',
      'eps': 'Austrian online banking',
      'giropay': 'German online banking',
      'sofort': 'German online banking',
      'alipay': 'Chinese mobile payment',
      'wechat_pay': 'Chinese mobile payment',
      'upi': 'Indian mobile payment',
      'netbanking': 'Direct bank transfer',
      'wallet': 'Digital wallet payment'
    };
    
    return descriptions[method] || 'Secure payment method';
  }

  /**
   * Get tenant branding configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Branding configuration
   */
  async getTenantBranding(tenantId) {
    const query = `
      SELECT 
        school_name, logo_url, primary_color, secondary_color,
        font_family, custom_css, domain, ssl_certificate_status
      FROM tenants 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [tenantId]);
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    return result.rows[0];
  }

  /**
   * Store payment flow configuration
   * @param {Object} flow - Flow configuration
   */
  async storePaymentFlow(flow) {
    const query = `
      INSERT INTO payment_flows (
        id, tenant_id, branding_config, payment_config, 
        features_config, security_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      flow.id,
      flow.tenantId,
      JSON.stringify(flow.branding),
      JSON.stringify(flow.paymentConfig),
      JSON.stringify(flow.features),
      JSON.stringify(flow.security)
    ]);
  }

  /**
   * Get payment flow
   * @param {string} flowId - Flow ID
   * @returns {Object} Flow configuration
   */
  async getPaymentFlow(flowId) {
    const query = `
      SELECT * FROM payment_flows WHERE id = $1
    `;

    const result = await this.db.query(query, [flowId]);
    if (result.rows.length === 0) {
      throw new Error('Payment flow not found');
    }

    const flow = result.rows[0];
    return {
      id: flow.id,
      tenantId: flow.tenant_id,
      branding: JSON.parse(flow.branding_config),
      paymentConfig: JSON.parse(flow.payment_config),
      features: JSON.parse(flow.features_config),
      security: JSON.parse(flow.security_config),
      createdAt: flow.created_at
    };
  }

  /**
   * Update payment flow
   * @param {string} flowId - Flow ID
   * @param {Object} updates - Updates to apply
   */
  async updatePaymentFlow(flowId, updates) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updates.branding) {
      updateFields.push(`branding_config = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.branding));
    }

    if (updates.paymentConfig) {
      updateFields.push(`payment_config = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.paymentConfig));
    }

    if (updates.features) {
      updateFields.push(`features_config = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.features));
    }

    if (updates.security) {
      updateFields.push(`security_config = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.security));
    }

    if (updateFields.length === 0) {
      throw new Error('No updates provided');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(flowId);

    const query = `
      UPDATE payment_flows 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await this.db.query(query, updateValues);
  }

  /**
   * Delete payment flow
   * @param {string} flowId - Flow ID
   */
  async deletePaymentFlow(flowId) {
    const query = `
      DELETE FROM payment_flows WHERE id = $1
    `;

    await this.db.query(query, [flowId]);
  }

  /**
   * Get payment flows for tenant
   * @param {string} tenantId - Tenant ID
   * @param {number} limit - Limit
   * @returns {Array} Payment flows
   */
  async getTenantPaymentFlows(tenantId, limit = 50) {
    const query = `
      SELECT id, branding_config, payment_config, created_at, updated_at
      FROM payment_flows 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await this.db.query(query, [tenantId, limit]);
    return result.rows.map(flow => ({
      id: flow.id,
      branding: JSON.parse(flow.branding_config),
      paymentConfig: JSON.parse(flow.payment_config),
      createdAt: flow.created_at,
      updatedAt: flow.updated_at
    }));
  }
}

module.exports = WhiteLabelPaymentService;
