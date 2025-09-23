/**
 * Card Component
 * 
 * A reusable card component with customizable styling and content areas.
 * Supports white-label theming through CSS custom properties.
 * 
 * Props:
 * - title: Card title (optional)
 * - subtitle: Card subtitle (optional)
 * - icon: Icon component or emoji (optional)
 * - children: Card content
 * - className: Additional CSS classes
 * - variant: 'default', 'elevated', 'outlined', 'filled'
 * - size: 'sm', 'md', 'lg', 'xl'
 * - onClick: Click handler (optional)
 * - loading: Show loading state (optional)
 * 
 * Usage:
 * <Card title="Student Count" icon="👨‍🎓" variant="elevated">
 *   <div>Content here</div>
 * </Card>
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

const Card = ({
  title,
  subtitle,
  icon,
  children,
  className = '',
  variant = 'default',
  size = 'md',
  onClick,
  loading = false,
  ...props
}) => {
  const { t } = useTranslation();

  const baseClasses = 'rounded-lg transition-all duration-200';
  
  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white shadow-lg border border-gray-100',
    outlined: 'bg-transparent border-2 border-gray-300',
    filled: 'bg-gray-50 border border-gray-200'
  };
  
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };
  
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : '';
  
  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${interactiveClasses}
    ${className}
  `.trim();

  const handleClick = (e) => {
    if (onClick && !loading) {
      onClick(e);
    }
  };

  if (loading) {
    return (
      <div className={cardClasses} {...props}>
        <div className="animate-pulse">
          {title && (
            <div className="flex items-center mb-4">
              {icon && <div className="w-6 h-6 bg-gray-300 rounded mr-3"></div>}
              <div className="h-5 bg-gray-300 rounded w-1/3"></div>
            </div>
          )}
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      {...props}
    >
      {(title || subtitle || icon) && (
        <div className="mb-4">
          {title && (
            <div className="flex items-center mb-2">
              {icon && (
                <span className="text-2xl mr-3" role="img" aria-label={title}>
                  {icon}
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
                {title}
              </h3>
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 ml-9" style={{ fontFamily: 'var(--font-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="text-gray-700" style={{ fontFamily: 'var(--font-primary)' }}>
        {children}
      </div>
    </div>
  );
};

export default Card;
