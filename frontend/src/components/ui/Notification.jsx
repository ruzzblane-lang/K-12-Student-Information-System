/**
 * Notification Component
 * 
 * A reusable notification component for displaying alerts and system messages.
 * Supports various types and auto-dismiss functionality.
 * 
 * Props:
 * - type: 'success', 'error', 'warning', 'info'
 * - title: Notification title (optional)
 * - message: Notification message
 * - icon: Custom icon (optional)
 * - autoDismiss: Auto dismiss after delay (default: true)
 * - dismissDelay: Dismiss delay in ms (default: 5000)
 * - onDismiss: Dismiss handler (optional)
 * - className: Additional CSS classes
 * - actions: Array of action buttons (optional)
 * 
 * Usage:
 * <Notification type="success" title="Success" message="Operation completed">
 *   <button>View Details</button>
 * </Notification>
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Notification = ({
  type = 'info',
  title,
  message,
  icon,
  autoDismiss = true,
  dismissDelay = 5000,
  onDismiss,
  className = '',
  actions = [],
  children,
  ...props
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  const typeConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      defaultIcon: '✓'
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      defaultIcon: '⚠'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      defaultIcon: '⚠'
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      defaultIcon: 'ℹ'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissDelay, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        ${config.bgColor}
        ${config.borderColor}
        border rounded-lg p-4 shadow-sm
        ${className}
      `.trim()}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span
            className={`text-lg ${config.iconColor}`}
            role="img"
            aria-label={type}
          >
            {icon || config.defaultIcon}
          </span>
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3
              className={`text-sm font-medium ${config.titleColor}`}
              style={{ fontFamily: 'var(--font-primary)' }}
            >
              {title}
            </h3>
          )}
          
          <div
            className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}
            style={{ fontFamily: 'var(--font-primary)' }}
          >
            {message}
          </div>
          
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
          
          {actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`text-sm font-medium ${
                    type === 'success' ? 'text-green-600 hover:text-green-500' :
                    type === 'error' ? 'text-red-600 hover:text-red-500' :
                    type === 'warning' ? 'text-yellow-600 hover:text-yellow-500' :
                    'text-blue-600 hover:text-blue-500'
                  } focus:outline-none focus:underline`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={handleDismiss}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' :
                  type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' :
                  type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' :
                  'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'}
              `}
            >
              <span className="sr-only">{t('common.close')}</span>
              <span className="text-sm">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
