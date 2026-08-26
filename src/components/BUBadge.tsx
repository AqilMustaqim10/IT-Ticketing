/**
 * @file BUBadge.tsx
 * @description Dynamic Business Unit badge/tag that automatically renders
 * with the Business Unit's customized theme color, icon or indicator dot.
 */

import React from 'react';
import { Building2, Utensils, Hotel, Activity, Landmark, Layers } from 'lucide-react';
import { BusinessUnit } from '../types';
import { getBUTheme, hexToRgba } from '../utils/themeUtils';

interface BUBadgeProps {
  businessUnit?: BusinessUnit | string | null;
  allBusinessUnits?: BusinessUnit[];
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  showIcon?: boolean;
  variant?: 'subtle' | 'solid' | 'outline' | 'pill';
  className?: string;
  onClick?: () => void;
}

export const BUBadge: React.FC<BUBadgeProps> = ({
  businessUnit,
  allBusinessUnits,
  size = 'sm',
  showDot = true,
  showIcon = false,
  variant = 'subtle',
  className = '',
  onClick,
}) => {
  const theme = getBUTheme(businessUnit, allBusinessUnits);

  const getIcon = (code: string) => {
    switch (code) {
      case 'CCEC':
        return <Building2 className="w-3 h-3 shrink-0" />;
      case 'FNB':
        return <Utensils className="w-3 h-3 shrink-0" />;
      case 'HOTEL':
        return <Hotel className="w-3 h-3 shrink-0" />;
      case 'KLBS':
        return <Building2 className="w-3 h-3 shrink-0" />;
      case 'KLW':
        return <Activity className="w-3 h-3 shrink-0" />;
      case 'UOA HQ':
      case 'UOA_HQ':
        return <Landmark className="w-3 h-3 shrink-0" />;
      default:
        return <Layers className="w-3 h-3 shrink-0" />;
    }
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  let style: React.CSSProperties = {};

  if (variant === 'subtle') {
    style = {
      backgroundColor: theme.bgLight,
      color: theme.primary,
      borderColor: theme.border,
      borderWidth: '1px',
      borderStyle: 'solid',
    };
  } else if (variant === 'solid') {
    style = {
      backgroundColor: theme.primary,
      color: '#ffffff',
    };
  } else if (variant === 'outline') {
    style = {
      backgroundColor: 'transparent',
      color: theme.primary,
      borderColor: theme.primary,
      borderWidth: '1px',
      borderStyle: 'solid',
    };
  } else if (variant === 'pill') {
    style = {
      backgroundColor: theme.bgSoft,
      color: theme.primary,
    };
  }

  return (
    <span
      id={`bu-badge-${theme.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      onClick={onClick}
      style={style}
      className={`inline-flex items-center font-medium font-mono rounded-md shrink-0 transition-colors ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
      title={`${theme.name} (${theme.code})`}
    >
      {showIcon ? (
        <span style={{ color: variant === 'solid' ? '#ffffff' : theme.primary }}>
          {getIcon(theme.code)}
        </span>
      ) : showDot ? (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: variant === 'solid' ? '#ffffff' : theme.primary }}
        />
      ) : null}
      <span className="font-semibold tracking-tight">{theme.code}</span>
    </span>
  );
};
