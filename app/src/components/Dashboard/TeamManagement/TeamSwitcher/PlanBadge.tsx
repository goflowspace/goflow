import React from 'react';

import {getPlanColor} from '@hooks/useSubscriptionPlan';

import styles from './PlanBadge.module.scss';

type PlanType = 'free' | 'pro' | 'team' | 'enterprise';

interface PlanBadgeProps {
  planType: PlanType;
  className?: string;
  size?: 'small' | 'medium';
}

const PlanBadge: React.FC<PlanBadgeProps> = ({planType, className = '', size = 'small'}) => {
  const getPlanLabel = (type: PlanType): string => {
    const labels = {
      free: 'FREE',
      pro: 'PRO',
      team: 'TEAM',
      enterprise: 'ENTERPRISE'
    };
    return labels[type];
  };

  const badgeStyle = {
    backgroundColor: `${getPlanColor(planType)}15`,
    color: getPlanColor(planType),
    borderColor: `${getPlanColor(planType)}30`
  };

  return (
    <span className={`${styles.badge} ${styles[size]} ${className}`} style={badgeStyle}>
      {getPlanLabel(planType)}
    </span>
  );
};

export default PlanBadge;
