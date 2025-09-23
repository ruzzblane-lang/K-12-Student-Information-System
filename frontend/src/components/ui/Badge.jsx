/**
 * Badge Component
 * 
 * A reusable badge component for displaying status, roles, and tags.
 * Supports various variants and white-label theming.
 * 
 * Props:
 * - children: Badge content
 * - variant: 'default', 'success', 'warning', 'error', 'info', 'primary', 'secondary'
 * - size: 'sm', 'md', 'lg'
 * - className: Additional CSS classes
 * - icon: Icon component or emoji (optional)
 * - removable: Show remove button (optional)
 * - onRemove: Remove handler (optional)
 * 
 * Usage:
 * <Badge variant="success" icon="✓">Active</Badge>
 * <Badge variant="error" removable onRemove={handleRemove}>Error</Badge>
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  removable = false,
  onRemove,
  ...props
}) => {
  const { t } = useTranslation();

  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };
  
  const badgeClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span className={badgeClasses} {...props}>
      {icon && (
        <span className="mr-1" role="img" aria-label={children}>
          {icon}
        </span>
      )}
      <span style={{ fontFamily: 'var(--font-primary)' }}>
        {children}
      </span>
      {removable && (
        <button
          onClick={handleRemove}
          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
          aria-label={t('common.remove')}
        >
          <span className="text-xs">×</span>
        </button>
      )}
    </span>
  );
};

export default Badge;
