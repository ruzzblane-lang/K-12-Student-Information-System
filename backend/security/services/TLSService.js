const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

/**
 * TLSService - Provides TLS 1.3 configuration and secure communication
 * Implements secure server configuration with modern TLS protocols
 */
class TLSService {
  constructor(config) {
    this.config = config;
    this.tlsVersion = 'TLSv1.3';
    this.minTlsVersion = 'TLSv1.2';
    this.cipherSuites = this.getSecureCipherSuites();
    this.certificates = this.loadCertificates();
    
    console.log('TLSService initialized with TLS 1.3 support');
  }

  /**
   * Get secure cipher suites for TLS 1.3
   */
  getSecureCipherSuites() {
    return [
      // TLS 1.3 cipher suites (only these are supported in TLS 1.3)
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      
      // TLS 1.2 cipher suites (for fallback)
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-CHACHA20-POLY1305',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-ECDSA-AES128-GCM-SHA256'
    ];
  }

  /**
   * Load SSL certificates
   */
  loadCertificates() {
    const certPath = path.join(process.cwd(), 'config', 'ssl');
    
    try {
      const certificates = {
        key: fs.readFileSync(path.join(certPath, 'private.key')),
        cert: fs.readFileSync(path.join(certPath, 'certificate.crt')),
        ca: fs.readFileSync(path.join(certPath, 'ca-bundle.crt'))
      };
      
      console.log('SSL certificates loaded successfully');
      return certificates;
    } catch (error) {
      console.warn('Could not load SSL certificates:', error.message);
      return null;
    }
  }

  /**
   * Create secure HTTPS server options
   */
  createSecureServerOptions() {
    const options = {
      // TLS version configuration
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      
      // Cipher suite configuration
      ciphers: this.cipherSuites.join(':'),
      honorCipherOrder: true,
      
      // Certificate configuration
      key: this.certificates?.key,
      cert: this.certificates?.cert,
      ca: this.certificates?.ca,
      
      // Security options
      secureOptions: tls.constants.SSL_OP_NO_SSLv2 |
                    tls.constants.SSL_OP_NO_SSLv3 |
                    tls.constants.SSL_OP_NO_TLSv1 |
                    tls.constants.SSL_OP_NO_TLSv1_1 |
                    tls.constants.SSL_OP_NO_COMPRESSION |
                    tls.constants.SSL_OP_CIPHER_SERVER_PREFERENCE,
      
      // Session configuration
      sessionTimeout: 300, // 5 minutes
      sessionIdContext: 'school-sis-secure',
      
      // Additional security headers
      requestCert: true,
      rejectUnauthorized: true,
      
      // HSTS (HTTP Strict Transport Security)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    };
    
    return options;
  }

  /**
   * Create secure HTTPS server
   */
  createSecureServer(app) {
    const options = this.createSecureServerOptions();
    
    if (!options.key || !options.cert) {
      throw new Error('SSL certificates not found. Please ensure certificates are properly configured.');
    }
    
    const server = https.createServer(options, app);
    
    // Add security event listeners
    server.on('secureConnection', (tlsSocket) => {
      this.handleSecureConnection(tlsSocket);
    });
    
    server.on('clientError', (err, socket) => {
      this.handleClientError(err, socket);
    });
    
    return server;
  }

  /**
   * Handle secure connection events
   */
  handleSecureConnection(tlsSocket) {
    const protocol = tlsSocket.getProtocol();
    const cipher = tlsSocket.getCipher();
    
    console.log(`Secure connection established: ${protocol} with ${cipher.name}`);
    
    // Log connection details for security audit
    this.logSecureConnection({
      protocol: protocol,
      cipher: cipher.name,
      version: cipher.version,
      remoteAddress: tlsSocket.remoteAddress,
      timestamp: new Date().toISOString()
    });
    
    // Set connection timeout
    tlsSocket.setTimeout(30000); // 30 seconds
    
    // Handle connection errors
    tlsSocket.on('error', (error) => {
      console.error('TLS connection error:', error);
      this.logSecurityEvent('TLS_ERROR', {
        error: error.message,
        remoteAddress: tlsSocket.remoteAddress,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle connection close
    tlsSocket.on('close', () => {
      console.log('TLS connection closed');
    });
  }

  /**
   * Handle client errors
   */
  handleClientError(err, socket) {
    console.error('Client error:', err);
    
    // Log security event
    this.logSecurityEvent('CLIENT_ERROR', {
      error: err.message,
      code: err.code,
      remoteAddress: socket.remoteAddress,
      timestamp: new Date().toISOString()
    });
    
    // Close connection on error
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  }

  /**
   * Create secure TLS connection
   */
  createSecureConnection(options) {
    const secureOptions = {
      ...options,
      secureProtocol: 'TLSv1_3_method',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: this.cipherSuites.join(':'),
      honorCipherOrder: true,
      rejectUnauthorized: true,
      requestCert: true
    };
    
    return tls.connect(secureOptions);
  }

  /**
   * Verify SSL certificate
   */
  verifyCertificate(cert, hostname) {
    try {
      const crypto = require('crypto');
      const x509 = require('x509');
      
      // Parse certificate
      const certInfo = x509.parseCert(cert);
      
      // Check expiration
      const now = new Date();
      const notAfter = new Date(certInfo.notAfter);
      const notBefore = new Date(certInfo.notBefore);
      
      if (now < notBefore || now > notAfter) {
        return {
          valid: false,
          error: 'Certificate expired or not yet valid'
        };
      }
      
      // Check hostname
      if (hostname && !this.verifyHostname(certInfo, hostname)) {
        return {
          valid: false,
          error: 'Hostname mismatch'
        };
      }
      
      return {
        valid: true,
        subject: certInfo.subject,
        issuer: certInfo.issuer,
        notBefore: certInfo.notBefore,
        notAfter: certInfo.notAfter
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify hostname against certificate
   */
  verifyHostname(certInfo, hostname) {
    const subjectAltNames = certInfo.subjectAltName || [];
    const commonName = certInfo.subject?.CN;
    
    // Check subject alternative names
    for (const san of subjectAltNames) {
      if (san.type === 'DNS' && this.matchesHostname(san.value, hostname)) {
        return true;
      }
    }
    
    // Check common name
    if (commonName && this.matchesHostname(commonName, hostname)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if hostname matches pattern
   */
  matchesHostname(pattern, hostname) {
    if (pattern === hostname) {
      return true;
    }
    
    // Handle wildcard certificates
    if (pattern.startsWith('*.')) {
      const domain = pattern.substring(2);
      return hostname.endsWith(domain);
    }
    
    return false;
  }

  /**
   * Generate SSL certificate request
   */
  generateCertificateRequest(options) {
    const forge = require('node-forge');
    
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    
    csr.publicKey = keys.publicKey;
    csr.setSubject([
      { name: 'countryName', value: options.country || 'US' },
      { name: 'stateOrProvinceName', value: options.state || 'State' },
      { name: 'localityName', value: options.city || 'City' },
      { name: 'organizationName', value: options.organization || 'School SIS' },
      { name: 'organizationalUnitName', value: options.unit || 'IT Department' },
      { name: 'commonName', value: options.commonName || 'localhost' }
    ]);
    
    // Add subject alternative names
    if (options.san) {
      csr.setAttributes([
        {
          name: 'extensionRequest',
          extensions: [
            {
              name: 'subjectAltName',
              altNames: options.san.map(name => ({
                type: 2, // DNS
                value: name
              }))
            }
          ]
        }
      ]);
    }
    
    csr.sign(keys.privateKey);
    
    return {
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
      publicKey: forge.pki.publicKeyToPem(keys.publicKey),
      csr: forge.pki.certificationRequestToPem(csr)
    };
  }

  /**
   * Log secure connection details
   */
  logSecureConnection(connectionInfo) {
    const logEntry = {
      type: 'SECURE_CONNECTION',
      ...connectionInfo,
      timestamp: new Date().toISOString()
    };
    
    // Log to file
    this.writeSecurityLog(logEntry);
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, eventData) {
    const logEntry = {
      type: eventType,
      ...eventData,
      timestamp: new Date().toISOString()
    };
    
    // Log to file
    this.writeSecurityLog(logEntry);
  }

  /**
   * Write security log entry
   */
  writeSecurityLog(logEntry) {
    const logPath = path.join(process.cwd(), 'logs', 'security.log');
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logPath, logLine);
  }

  /**
   * Get TLS configuration status
   */
  getTLSStatus() {
    return {
      tlsVersion: this.tlsVersion,
      minTlsVersion: this.minTlsVersion,
      cipherSuites: this.cipherSuites,
      certificatesLoaded: !!this.certificates,
      securityOptions: {
        noSSLv2: true,
        noSSLv3: true,
        noTLSv1: true,
        noTLSv1_1: true,
        noCompression: true,
        cipherServerPreference: true
      }
    };
  }
}

module.exports = TLSService;
