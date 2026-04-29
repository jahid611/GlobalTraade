"use client";

import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VerifiedBadgeProps {
  kycStatus?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function VerifiedBadge({ kycStatus, size = 'md', showTooltip = true }: VerifiedBadgeProps) {
  const { t } = useTranslation();
  
  if (kycStatus !== 'verified') return null;

  const sizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  };

  return (
    <span 
      className="inline-flex items-center shrink-0" 
      title={showTooltip ? t('kyc.verified_badge') : undefined}
    >
      <BadgeCheck 
        className={`${sizeMap[size]} text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]`} 
        strokeWidth={2.2}
      />
    </span>
  );
}
