// SSL/TLS Configuration for PCI DSS Compliance
module.exports = {
  // SSL/TLS Settings
  ssl: {
    enabled: true,
    key: process.env.SSL_KEY_PATH || './ssl/server.key',
    cert: process.env.SSL_CERT_PATH || './ssl/server.crt',
    ca: process.env.SSL_CA_PATH || './ssl/ca.crt',
    ciphers: [
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256'
    ].join(':'),
    honorCipherOrder: true,
    secureProtocol: 'TLSv1_2_method'
  },
  
  // HSTS Configuration
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Security Headers
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com;"
  }
};
