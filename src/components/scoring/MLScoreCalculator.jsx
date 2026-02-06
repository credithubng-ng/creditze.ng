// ML Score Calculator - Analyzes user behavior and transaction data
// to generate an AI-enhanced credit score

export const calculateMLScore = async (userId, behaviorData, config) => {
  const weights = config.component_weights || {
    transaction_analysis: 35,
    behavioral_patterns: 25,
    device_trust: 15,
    identity_consistency: 25
  };

  const thresholds = config.thresholds || {};
  const penalties = config.risk_flag_penalties || {};
  const bonuses = config.bonus_factors || {};

  let riskFlags = [];
  let bonusFactors = [];
  
  // 1. Transaction Analysis Score (0-100)
  const transactionScore = calculateTransactionScore(
    behaviorData?.transaction_analysis,
    thresholds,
    riskFlags,
    bonusFactors
  );

  // 2. Behavioral Patterns Score (0-100)
  const behavioralScore = calculateBehavioralScore(
    behaviorData?.session_metrics,
    behaviorData?.interaction_patterns,
    thresholds,
    riskFlags,
    bonusFactors
  );

  // 3. Device Trust Score (0-100)
  const deviceScore = calculateDeviceTrustScore(
    behaviorData?.device_info,
    behaviorData?.location_data,
    riskFlags
  );

  // 4. Identity Consistency Score (0-100)
  const identityScore = calculateIdentityScore(
    behaviorData?.interaction_patterns,
    behaviorData?.device_info,
    thresholds,
    riskFlags,
    bonusFactors
  );

  // Calculate weighted ML score
  const totalWeight = weights.transaction_analysis + weights.behavioral_patterns + 
                      weights.device_trust + weights.identity_consistency;
  
  let mlScore = (
    (transactionScore * weights.transaction_analysis) +
    (behavioralScore * weights.behavioral_patterns) +
    (deviceScore * weights.device_trust) +
    (identityScore * weights.identity_consistency)
  ) / totalWeight;

  // Apply penalties for risk flags
  let totalPenalty = 0;
  riskFlags.forEach(flag => {
    const penalty = penalties[flag] || 5;
    totalPenalty += penalty;
  });
  mlScore = Math.max(0, mlScore - totalPenalty);

  // Apply bonuses
  let totalBonus = 0;
  bonusFactors.forEach(factor => {
    const bonus = bonuses[factor] || 3;
    totalBonus += bonus;
  });
  mlScore = Math.min(100, mlScore + totalBonus);

  // Determine confidence level based on data availability
  const confidenceLevel = determineConfidence(behaviorData);

  // Generate recommendation
  const recommendation = mlScore >= 70 ? 'approve' : mlScore >= 50 ? 'review' : 'reject';

  // Generate explanation
  const explanation = generateExplanation(
    mlScore,
    { transactionScore, behavioralScore, deviceScore, identityScore },
    riskFlags,
    bonusFactors,
    confidenceLevel
  );

  return {
    ml_score: Math.round(mlScore),
    ml_score_breakdown: {
      transaction_score: Math.round(transactionScore),
      behavioral_score: Math.round(behavioralScore),
      device_trust_score: Math.round(deviceScore),
      identity_score: Math.round(identityScore)
    },
    risk_flags_detected: riskFlags,
    bonus_factors_applied: bonusFactors,
    confidence_level: confidenceLevel,
    recommendation,
    explanation
  };
};

function calculateTransactionScore(txData, thresholds, riskFlags, bonusFactors) {
  if (!txData) return 50; // Default score if no data

  let score = 50; // Base score

  // Monthly inflow analysis
  const minInflow = thresholds.min_monthly_inflow || 30000;
  if (txData.avg_monthly_inflow >= minInflow * 3) {
    score += 20;
  } else if (txData.avg_monthly_inflow >= minInflow) {
    score += 10;
  } else if (txData.avg_monthly_inflow < minInflow * 0.5) {
    score -= 15;
  }

  // Salary detection
  if (txData.salary_detected) {
    bonusFactors.push('salary_detected');
    score += 15;
    
    // Salary consistency
    const minConsistency = thresholds.min_salary_consistency || 0.7;
    if (txData.salary_consistency_score >= minConsistency) {
      score += 10;
    } else if (txData.salary_consistency_score < 0.5) {
      score -= 5;
    }
  }

  // Gambling detection
  if (txData.gambling_transactions_detected) {
    riskFlags.push('gambling_detected');
    score -= 20;
  }

  // Bounced debits
  const maxBounced = thresholds.max_bounced_debits || 2;
  if (txData.bounced_debits_count > maxBounced) {
    riskFlags.push('bounced_debits');
    score -= 25;
  } else if (txData.bounced_debits_count > 0) {
    score -= txData.bounced_debits_count * 5;
  }

  // Account age
  const minAge = thresholds.min_account_age_months || 3;
  if (txData.account_age_months >= minAge * 4) {
    bonusFactors.push('long_account_age');
    score += 10;
  } else if (txData.account_age_months >= minAge) {
    score += 5;
  } else {
    score -= 10;
  }

  // Low balance frequency
  if (txData.low_balance_frequency > 0.5) {
    riskFlags.push('low_balance_frequency');
    score -= 15;
  } else if (txData.low_balance_frequency > 0.3) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateBehavioralScore(sessionData, interactionData, thresholds, riskFlags, bonusFactors) {
  if (!sessionData && !interactionData) return 50;

  let score = 50;

  if (sessionData) {
    // Session duration analysis
    const minDuration = thresholds.min_session_duration || 60;
    if (sessionData.avg_session_duration_seconds >= minDuration * 3) {
      score += 10;
    } else if (sessionData.avg_session_duration_seconds < minDuration * 0.5) {
      score -= 5;
    }

    // Form abandonment
    const maxAbandonment = thresholds.max_form_abandonment || 0.5;
    if (sessionData.form_abandonment_rate > maxAbandonment) {
      score -= 10;
    }

    // KYC completion time (too fast might indicate fraud)
    if (sessionData.kyc_completion_time_minutes < 2) {
      riskFlags.push('rapid_application');
      score -= 10;
    } else if (sessionData.kyc_completion_time_minutes > 60) {
      score -= 5; // Too slow might indicate issues
    }

    // Multiple application attempts
    if (sessionData.application_attempts > 3) {
      score -= 10;
    }
  }

  if (interactionData) {
    // Days since registration
    if (interactionData.days_since_registration >= 30) {
      score += 10;
    } else if (interactionData.days_since_registration < 7) {
      score -= 5;
    }

    // Profile completeness
    const minCompleteness = thresholds.min_profile_completeness || 80;
    if (interactionData.profile_completeness_percent >= minCompleteness) {
      bonusFactors.push('complete_profile');
      score += 10;
    } else if (interactionData.profile_completeness_percent < 50) {
      score -= 10;
    }

    // Consistent login patterns
    if (interactionData.typical_login_hours?.length > 0) {
      const variance = calculateTimeVariance(interactionData.typical_login_hours);
      if (variance < 6) {
        bonusFactors.push('consistent_login_pattern');
        score += 5;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

function calculateDeviceTrustScore(deviceData, locationData, riskFlags) {
  if (!deviceData && !locationData) return 60; // Neutral score

  let score = 70; // Start higher for device trust

  if (deviceData) {
    // Known device type
    if (deviceData.device_type && deviceData.os) {
      score += 10;
    }

    // Device fingerprint consistency (would check against previous sessions)
    if (deviceData.device_fingerprint) {
      score += 5;
    }
  }

  if (locationData) {
    // VPN detection
    if (locationData.is_vpn) {
      riskFlags.push('vpn_detected');
      score -= 20;
    }

    // Nigeria-based
    if (locationData.country === 'NG' || locationData.country === 'Nigeria') {
      score += 10;
    } else if (locationData.country) {
      riskFlags.push('inconsistent_location');
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function calculateIdentityScore(interactionData, deviceData, thresholds, riskFlags, bonusFactors) {
  let score = 60;

  if (interactionData) {
    // Document upload attempts (too many might indicate issues)
    if (interactionData.document_upload_attempts > 5) {
      score -= 10;
    } else if (interactionData.document_upload_attempts <= 2) {
      score += 10;
    }

    // Support tickets (might indicate verification issues)
    if (interactionData.support_tickets_opened > 3) {
      score -= 5;
    }
  }

  // Multiple devices (would need historical data)
  // This is a placeholder for more sophisticated device tracking
  if (deviceData?.multiple_devices_detected) {
    riskFlags.push('multiple_devices');
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateTimeVariance(hours) {
  if (!hours || hours.length < 2) return 24;
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
  return Math.sqrt(variance);
}

function determineConfidence(behaviorData) {
  let dataPoints = 0;
  
  if (behaviorData?.transaction_analysis?.avg_monthly_inflow) dataPoints += 3;
  if (behaviorData?.session_metrics?.total_sessions > 2) dataPoints += 2;
  if (behaviorData?.device_info?.device_type) dataPoints += 1;
  if (behaviorData?.location_data?.country) dataPoints += 1;
  if (behaviorData?.interaction_patterns?.days_since_registration > 7) dataPoints += 2;

  if (dataPoints >= 7) return 'high';
  if (dataPoints >= 4) return 'medium';
  return 'low';
}

function generateExplanation(score, breakdown, riskFlags, bonusFactors, confidence) {
  let explanation = `ML Score: ${Math.round(score)}/100 (${confidence} confidence). `;
  
  // Highlight strongest/weakest areas
  const scores = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  explanation += `Strongest: ${formatScoreName(scores[0][0])} (${scores[0][1]}). `;
  
  if (scores[scores.length - 1][1] < 50) {
    explanation += `Needs improvement: ${formatScoreName(scores[scores.length - 1][0])} (${scores[scores.length - 1][1]}). `;
  }

  if (riskFlags.length > 0) {
    explanation += `Risk factors: ${riskFlags.map(f => f.replace(/_/g, ' ')).join(', ')}. `;
  }

  if (bonusFactors.length > 0) {
    explanation += `Positive factors: ${bonusFactors.map(f => f.replace(/_/g, ' ')).join(', ')}.`;
  }

  return explanation;
}

function formatScoreName(name) {
  return name.replace(/_/g, ' ').replace(/score$/, '').trim();
}

// Combine ML score with rule-based score
export const calculateCombinedScore = (ruleScore, mlScore, mlWeight = 30) => {
  const ruleWeight = 100 - mlWeight;
  return Math.round((ruleScore * ruleWeight + mlScore * mlWeight) / 100);
};

export default { calculateMLScore, calculateCombinedScore };