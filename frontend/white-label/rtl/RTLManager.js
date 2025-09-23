/**
 * RTL (Right-to-Left) Manager for White-Label Development
 * 
 * Provides comprehensive RTL support for Arabic, Hebrew, Persian, and other
 * RTL languages with proper text direction, layout adjustments, and cultural formatting.
 */

export class RTLManager {
  constructor() {
    this.rtlLocales = [
      'ar', 'ar-SA', 'ar-EG', 'ar-AE', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-MA', 'ar-QA', 'ar-SY', 'ar-TN',
      'he', 'he-IL',
      'fa', 'fa-IR', 'fa-AF',
      'ur', 'ur-PK', 'ur-IN',
      'ps', 'ps-AF',
      'sd', 'sd-PK',
      'ku', 'ku-TR', 'ku-IQ', 'ku-IR', 'ku-SY',
      'dv', 'dv-MV'
    ];
    
    this.currentLocale = 'en';
    this.isRTL = false;
    this.direction = 'ltr';
    
    // RTL-specific CSS classes and styles
    this.rtlStyles = {
      textDirection: 'rtl',
      textAlign: 'right',
      marginLeft: 'margin-right',
      marginRight: 'margin-left',
      paddingLeft: 'padding-right',
      paddingRight: 'padding-left',
      borderLeft: 'border-right',
      borderRight: 'border-left',
      left: 'right',
      right: 'left',
      transformOrigin: 'top right'
    };
    
    this.initializeRTLManager();
  }

  initializeRTLManager() {
    // Create RTL-specific CSS
    this.createRTLStyles();
    
    // Set up mutation observer for dynamic content
    this.setupMutationObserver();
    
    console.log('RTLManager initialized');
  }

  /**
   * Set locale and update RTL settings
   */
  setLocale(locale) {
    this.currentLocale = locale;
    this.isRTL = this.isRTLLocale(locale);
    this.direction = this.isRTL ? 'rtl' : 'ltr';
    
    this.updateDocumentDirection();
    this.updateBodyClasses();
    this.applyRTLStyles();
    
    console.log(`RTL settings updated for locale: ${locale}, RTL: ${this.isRTL}`);
  }

  /**
   * Check if locale is RTL
   */
  isRTLLocale(locale) {
    const language = locale.split('-')[0];
    return this.rtlLocales.includes(locale) || this.rtlLocales.includes(language);
  }

  /**
   * Apply RTL styles to document
   */
  applyRTLStyles() {
    if (!this.isRTL) return;

    // Apply RTL styles to existing elements
    this.applyRTLToElements(document.querySelectorAll('*'));
    
    // Update CSS custom properties
    this.updateCSSProperties();
  }

  /**
   * Update document direction
   */
  updateDocumentDirection() {
    document.documentElement.dir = this.direction;
    document.documentElement.lang = this.currentLocale;
    
    // Update meta tags
    this.updateMetaTags();
  }

  /**
   * Update body classes
   */
  updateBodyClasses() {
    const body = document.body;
    
    // Remove existing direction classes
    body.classList.remove('rtl', 'ltr', 'direction-rtl', 'direction-ltr');
    
    // Add new direction class
    body.classList.add(this.direction);
    body.classList.add(`direction-${this.direction}`);
    
    // Add locale-specific class
    body.classList.add(`locale-${this.currentLocale.replace('-', '_')}`);
  }

  /**
   * Create RTL-specific CSS
   */
  createRTLStyles() {
    const styleId = 'rtl-manager-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const rtlCSS = `
      /* RTL Base Styles */
      [dir="rtl"] {
        direction: rtl;
        text-align: right;
      }
      
      [dir="ltr"] {
        direction: ltr;
        text-align: left;
      }

      /* RTL Layout Adjustments */
      .rtl .layout-horizontal {
        flex-direction: row-reverse;
      }
      
      .rtl .layout-horizontal > * {
        margin-left: 0;
        margin-right: auto;
      }
      
      .rtl .layout-horizontal > *:first-child {
        margin-right: 0;
      }

      /* RTL Navigation */
      .rtl .nav-item {
        text-align: right;
      }
      
      .rtl .nav-item .nav-icon {
        margin-left: 8px;
        margin-right: 0;
      }
      
      .rtl .breadcrumb {
        direction: rtl;
      }
      
      .rtl .breadcrumb > * {
        float: right;
      }

      /* RTL Forms */
      .rtl .form-label {
        text-align: right;
      }
      
      .rtl .form-input {
        text-align: right;
        direction: rtl;
      }
      
      .rtl .form-error {
        text-align: right;
      }
      
      .rtl .checkbox, .rtl .radio {
        margin-left: 8px;
        margin-right: 0;
      }

      /* RTL Tables */
      .rtl .table {
        direction: rtl;
      }
      
      .rtl .table th,
      .rtl .table td {
        text-align: right;
      }
      
      .rtl .table th:first-child,
      .rtl .table td:first-child {
        border-right: none;
        border-left: 1px solid #e5e7eb;
      }
      
      .rtl .table th:last-child,
      .rtl .table td:last-child {
        border-left: none;
        border-right: 1px solid #e5e7eb;
      }

      /* RTL Cards */
      .rtl .card-header {
        text-align: right;
      }
      
      .rtl .card-actions {
        justify-content: flex-start;
      }

      /* RTL Modals */
      .rtl .modal-header {
        text-align: right;
      }
      
      .rtl .modal-footer {
        flex-direction: row-reverse;
      }

      /* RTL Dropdowns */
      .rtl .dropdown-menu {
        right: 0;
        left: auto;
        text-align: right;
      }
      
      .rtl .dropdown-item {
        text-align: right;
      }

      /* RTL Tooltips */
      .rtl .tooltip {
        direction: rtl;
      }
      
      .rtl .tooltip-arrow {
        transform: scaleX(-1);
      }

      /* RTL Progress Bars */
      .rtl .progress-bar {
        transform-origin: right center;
      }

      /* RTL Date Pickers */
      .rtl .date-picker {
        direction: rtl;
      }
      
      .rtl .calendar {
        direction: rtl;
      }
      
      .rtl .calendar-day {
        text-align: center;
      }

      /* RTL Icons */
      .rtl .icon-arrow-left:before {
        content: "\\2192"; /* Right arrow */
      }
      
      .rtl .icon-arrow-right:before {
        content: "\\2190"; /* Left arrow */
      }
      
      .rtl .icon-chevron-left:before {
        content: "\\203A"; /* Right chevron */
      }
      
      .rtl .icon-chevron-right:before {
        content: "\\2039"; /* Left chevron */
      }

      /* RTL Animations */
      .rtl .slide-in-left {
        animation: slide-in-right 0.3s ease-out;
      }
      
      .rtl .slide-in-right {
        animation: slide-in-left 0.3s ease-out;
      }
      
      .rtl .slide-out-left {
        animation: slide-out-right 0.3s ease-out;
      }
      
      .rtl .slide-out-right {
        animation: slide-out-left 0.3s ease-out;
      }

      /* RTL Scrollbars */
      .rtl ::-webkit-scrollbar {
        direction: rtl;
      }

      /* RTL Print Styles */
      @media print {
        .rtl {
          direction: rtl;
          text-align: right;
        }
        
        .rtl .page-break {
          page-break-before: always;
        }
      }

      /* RTL Responsive Adjustments */
      @media (max-width: 768px) {
        .rtl .mobile-nav {
          right: 0;
          left: auto;
        }
        
        .rtl .mobile-menu {
          text-align: right;
        }
      }

      /* RTL Custom Properties */
      .rtl {
        --margin-start: var(--margin-right, 0);
        --margin-end: var(--margin-left, 0);
        --padding-start: var(--padding-right, 0);
        --padding-end: var(--padding-left, 0);
        --border-start: var(--border-right, none);
        --border-end: var(--border-left, none);
        --inset-start: var(--right, auto);
        --inset-end: var(--left, auto);
      }

      /* Animation Keyframes */
      @keyframes slide-in-right {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slide-in-left {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slide-out-right {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes slide-out-left {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(-100%);
          opacity: 0;
        }
      }
    `;

    styleElement.textContent = rtlCSS;
  }

  /**
   * Apply RTL styles to specific elements
   */
  applyRTLToElements(elements) {
    if (!this.isRTL) return;

    elements.forEach(element => {
      // Apply RTL classes
      this.applyRTLClasses(element);
      
      // Adjust margins and paddings
      this.adjustSpacing(element);
      
      // Adjust positioning
      this.adjustPositioning(element);
      
      // Adjust text alignment
      this.adjustTextAlignment(element);
    });
  }

  /**
   * Apply RTL classes to element
   */
  applyRTLClasses(element) {
    const rtlClasses = [
      'nav-item', 'form-label', 'form-input', 'form-error',
      'checkbox', 'radio', 'table', 'card-header', 'card-actions',
      'modal-header', 'modal-footer', 'dropdown-menu', 'dropdown-item',
      'tooltip', 'progress-bar', 'date-picker', 'calendar'
    ];

    rtlClasses.forEach(className => {
      if (element.classList.contains(className)) {
        element.classList.add('rtl-adjusted');
      }
    });
  }

  /**
   * Adjust spacing for RTL
   */
  adjustSpacing(element) {
    const computedStyle = window.getComputedStyle(element);
    
    // Swap margin-left and margin-right
    const marginLeft = computedStyle.marginLeft;
    const marginRight = computedStyle.marginRight;
    
    if (marginLeft !== '0px' || marginRight !== '0px') {
      element.style.setProperty('margin-left', marginRight);
      element.style.setProperty('margin-right', marginLeft);
    }

    // Swap padding-left and padding-right
    const paddingLeft = computedStyle.paddingLeft;
    const paddingRight = computedStyle.paddingRight;
    
    if (paddingLeft !== '0px' || paddingRight !== '0px') {
      element.style.setProperty('padding-left', paddingRight);
      element.style.setProperty('padding-right', paddingLeft);
    }
  }

  /**
   * Adjust positioning for RTL
   */
  adjustPositioning(element) {
    const computedStyle = window.getComputedStyle(element);
    
    // Swap left and right positioning
    const left = computedStyle.left;
    const right = computedStyle.right;
    
    if (left !== 'auto' || right !== 'auto') {
      element.style.setProperty('left', right);
      element.style.setProperty('right', left);
    }
  }

  /**
   * Adjust text alignment for RTL
   */
  adjustTextAlignment(element) {
    const textAlign = window.getComputedStyle(element).textAlign;
    
    if (textAlign === 'left') {
      element.style.textAlign = 'right';
    } else if (textAlign === 'right') {
      element.style.textAlign = 'left';
    }
  }

  /**
   * Update CSS custom properties
   */
  updateCSSProperties() {
    const root = document.documentElement;
    
    if (this.isRTL) {
      root.style.setProperty('--text-align', 'right');
      root.style.setProperty('--margin-start', 'var(--margin-right, 0)');
      root.style.setProperty('--margin-end', 'var(--margin-left, 0)');
      root.style.setProperty('--padding-start', 'var(--padding-right, 0)');
      root.style.setProperty('--padding-end', 'var(--padding-left, 0)');
      root.style.setProperty('--border-start', 'var(--border-right, none)');
      root.style.setProperty('--border-end', 'var(--border-left, none)');
      root.style.setProperty('--inset-start', 'var(--right, auto)');
      root.style.setProperty('--inset-end', 'var(--left, auto)');
    } else {
      root.style.setProperty('--text-align', 'left');
      root.style.setProperty('--margin-start', 'var(--margin-left, 0)');
      root.style.setProperty('--margin-end', 'var(--margin-right, 0)');
      root.style.setProperty('--padding-start', 'var(--padding-left, 0)');
      root.style.setProperty('--padding-end', 'var(--padding-right, 0)');
      root.style.setProperty('--border-start', 'var(--border-left, none)');
      root.style.setProperty('--border-end', 'var(--border-right, none)');
      root.style.setProperty('--inset-start', 'var(--left, auto)');
      root.style.setProperty('--inset-end', 'var(--right, auto)');
    }
  }

  /**
   * Update meta tags for RTL
   */
  updateMetaTags() {
    // Update or create meta tag for direction
    let metaDir = document.querySelector('meta[name="direction"]');
    if (!metaDir) {
      metaDir = document.createElement('meta');
      metaDir.name = 'direction';
      document.head.appendChild(metaDir);
    }
    metaDir.content = this.direction;

    // Update or create meta tag for language
    let metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (!metaLang) {
      metaLang = document.createElement('meta');
      metaLang.httpEquiv = 'content-language';
      document.head.appendChild(metaLang);
    }
    metaLang.content = this.currentLocale;

    // Update or create meta tag for text direction
    let metaTextDir = document.querySelector('meta[name="text-direction"]');
    if (!metaTextDir) {
      metaTextDir = document.createElement('meta');
      metaTextDir.name = 'text-direction';
      document.head.appendChild(metaTextDir);
    }
    metaTextDir.content = this.direction;
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.applyRTLToElements([node]);
              
              // Apply to child elements
              const childElements = node.querySelectorAll('*');
              this.applyRTLToElements(childElements);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Get RTL-aware CSS property
   */
  getRTLProperty(property) {
    if (!this.isRTL) return property;
    
    return this.rtlStyles[property] || property;
  }

  /**
   * Format text for RTL display
   */
  formatRTLText(text) {
    if (!this.isRTL) return text;
    
    // Handle mixed content (LTR text within RTL)
    return this.handleMixedContent(text);
  }

  /**
   * Handle mixed content (LTR text within RTL)
   */
  handleMixedContent(text) {
    // Wrap LTR content with Unicode directional marks
    const ltrPattern = /([a-zA-Z0-9@#$%^&*()+=\[\]{}|\\:";'<>?,.\/]+)/g;
    
    return text.replace(ltrPattern, (match) => {
      // Only wrap if the text contains Latin characters
      if (/[a-zA-Z]/.test(match)) {
        return `\u202D${match}\u202C`; // Left-to-right mark + content + pop directional formatting
      }
      return match;
    });
  }

  /**
   * Get RTL-aware margin/padding values
   */
  getRTLSpacing(property, value) {
    if (!this.isRTL) return { [property]: value };
    
    const rtlProperty = this.getRTLProperty(property);
    return { [rtlProperty]: value };
  }

  /**
   * Get RTL-aware positioning values
   */
  getRTLPositioning(property, value) {
    if (!this.isRTL) return { [property]: value };
    
    const rtlProperty = this.getRTLProperty(property);
    return { [rtlProperty]: value };
  }

  /**
   * Create RTL-aware CSS class
   */
  createRTLClass(baseClass, styles) {
    const rtlStyles = {};
    
    Object.keys(styles).forEach(property => {
      const rtlProperty = this.getRTLProperty(property);
      rtlStyles[property] = styles[property];
      if (rtlProperty !== property) {
        rtlStyles[rtlProperty] = styles[property];
      }
    });
    
    return rtlStyles;
  }

  /**
   * Get current RTL status
   */
  getRTLStatus() {
    return {
      currentLocale: this.currentLocale,
      isRTL: this.isRTL,
      direction: this.direction,
      supportedRTLLocales: this.rtlLocales
    };
  }

  /**
   * Reset RTL settings
   */
  reset() {
    this.currentLocale = 'en';
    this.isRTL = false;
    this.direction = 'ltr';
    
    this.updateDocumentDirection();
    this.updateBodyClasses();
    
    // Remove RTL-specific styles
    document.body.classList.remove('rtl', 'direction-rtl', 'locale-ar', 'locale-he', 'locale-fa');
    document.body.classList.add('ltr', 'direction-ltr');
  }
}

export default RTLManager;
