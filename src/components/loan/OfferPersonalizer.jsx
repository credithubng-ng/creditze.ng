/**
 * AI-driven loan offer personalization engine
 * Adjusts interest rates, amounts, and tenures based on user risk profile
 */

export function personalizeOffer({
  loanType,
  baseInterestRate,
  baseMaxAmount,
  baseTenureDays,
  mlScoreResult,
  creditLimit,
  behaviorData,
  abTestVariant,
  loanConfig
}) {
  const adjustments = [];
  let personalizedRate = baseInterestRate;
  let personalizedAmount = baseMaxAmount;
  let tenureOptions = [baseTenureDays];

  const score = mlScoreResult?.combined_score || mlScoreResult?.rule_based_score || 70;
  const riskFlags = mlScoreResult?.risk_flags_detected || [];
  const bonusFactors = mlScoreResult?.bonus_factors_applied || [];
  const confidenceLevel = mlScoreResult?.confidence_level || 'medium';
  const repaymentHistory = creditLimit?.successful_repayments || 0;

  // Apply A/B test strategy
  const strategy = abTestVariant?.strategy || {};

  // ========== INTEREST RATE ADJUSTMENTS ==========
  
  if (strategy.interest_rate_adjustment === 'aggressive') {
    // Aggressive: Lower rates for everyone to boost conversion
    personalizedRate = personalizedRate * 0.85;
    adjustments.push({
      factor: 'A/B Test Strategy',
      adjustment: '-15% base rate',
      impact: 'Aggressive conversion strategy'
    });
  } else if (strategy.interest_rate_adjustment === 'conservative') {
    // Conservative: Higher rates for risk mitigation
    personalizedRate = personalizedRate * 1.1;
    adjustments.push({
      factor: 'A/B Test Strategy',
      adjustment: '+10% base rate',
      impact: 'Conservative risk strategy'
    });
  } else if (strategy.interest_rate_adjustment === 'risk_based') {
    // Risk-based: Adjust based on ML score and risk profile
    
    // High score discount
    if (score >= 85 && strategy.interest_discount_for_high_score) {
      const discount = strategy.interest_discount_for_high_score;
      personalizedRate = personalizedRate * (1 - discount / 100);
      adjustments.push({
        factor: 'High Credit Score',
        adjustment: `-${discount}%`,
        impact: `Score: ${score}/100`
      });
    }

    // Risk premium
    if (riskFlags.length > 0 && strategy.interest_premium_for_risk) {
      const premium = strategy.interest_premium_for_risk * riskFlags.length;
      personalizedRate = personalizedRate * (1 + premium / 100);
      adjustments.push({
        factor: 'Risk Flags Detected',
        adjustment: `+${premium}%`,
        impact: `${riskFlags.length} flags: ${riskFlags.slice(0, 2).join(', ')}`
      });
    }

    // Confidence-based adjustment
    if (confidenceLevel === 'low') {
      personalizedRate = personalizedRate * 1.05;
      adjustments.push({
        factor: 'Low ML Confidence',
        adjustment: '+5%',
        impact: 'Limited data for scoring'
      });
    }

    // Repayment history discount
    if (repaymentHistory >= 3) {
      const discount = Math.min(10, repaymentHistory * 2);
      personalizedRate = personalizedRate * (1 - discount / 100);
      adjustments.push({
        factor: 'Excellent Repayment History',
        adjustment: `-${discount}%`,
        impact: `${repaymentHistory} successful repayments`
      });
    }

    // Bonus factors discount
    if (bonusFactors.length >= 2) {
      personalizedRate = personalizedRate * 0.95;
      adjustments.push({
        factor: 'Positive Behavior Factors',
        adjustment: '-5%',
        impact: `${bonusFactors.join(', ')}`
      });
    }
  }

  // ========== AMOUNT ADJUSTMENTS ==========
  
  if (strategy.amount_adjustment === 'generous') {
    const boost = strategy.amount_boost_percentage || 30;
    personalizedAmount = personalizedAmount * (1 + boost / 100);
    adjustments.push({
      factor: 'Generous Amount Strategy',
      adjustment: `+${boost}%`,
      impact: 'Increased loan limit'
    });
  } else if (strategy.amount_adjustment === 'score_based') {
    // Score-based amount adjustment
    if (score >= 90) {
      personalizedAmount = personalizedAmount * 1.3;
      adjustments.push({
        factor: 'Excellent Score',
        adjustment: '+30% amount',
        impact: `Score: ${score}/100`
      });
    } else if (score >= 80) {
      personalizedAmount = personalizedAmount * 1.15;
      adjustments.push({
        factor: 'Good Score',
        adjustment: '+15% amount',
        impact: `Score: ${score}/100`
      });
    } else if (score < 70) {
      personalizedAmount = personalizedAmount * 0.7;
      adjustments.push({
        factor: 'Lower Score',
        adjustment: '-30% amount',
        impact: `Score: ${score}/100`
      });
    }

    // Repayment history boost
    if (repaymentHistory >= 5) {
      personalizedAmount = personalizedAmount * 1.2;
      adjustments.push({
        factor: 'Trusted Borrower',
        adjustment: '+20% amount',
        impact: `${repaymentHistory} repayments`
      });
    }
  }

  // ========== TENURE ADJUSTMENTS ==========
  
  if (strategy.tenure_flexibility === 'flexible') {
    // Offer multiple tenure options
    if (loanType === 'urgent_10k') {
      tenureOptions = [30, 45, 60];
    } else {
      tenureOptions = [60, 90, 120];
    }
    adjustments.push({
      factor: 'Flexible Tenure',
      adjustment: 'Multiple options',
      impact: `${tenureOptions.join(', ')} days`
    });
  } else if (strategy.tenure_flexibility === 'risk_based') {
    if (score >= 85) {
      tenureOptions = loanType === 'urgent_10k' ? [30, 45, 60] : [60, 90, 120, 150];
      adjustments.push({
        factor: 'Extended Tenure Options',
        adjustment: 'High score benefit',
        impact: 'More flexibility'
      });
    } else if (riskFlags.length > 2) {
      tenureOptions = [baseTenureDays];
      adjustments.push({
        factor: 'Standard Tenure Only',
        adjustment: 'Risk mitigation',
        impact: 'Fixed tenure'
      });
    }
  }

  // Apply bounds
  personalizedRate = Math.max(5, Math.min(25, personalizedRate));
  personalizedAmount = Math.max(5000, Math.min(
    loanConfig?.tier1_max_amount || 5000000, 
    personalizedAmount
  ));

  return {
    personalizedRate: Math.round(personalizedRate * 100) / 100,
    personalizedAmount: Math.round(personalizedAmount),
    tenureOptions,
    adjustments,
    personalizationFactors: {
      ml_score: score,
      risk_flags_count: riskFlags.length,
      bonus_factors_count: bonusFactors.length,
      confidence_level: confidenceLevel,
      repayment_history_score: repaymentHistory,
      behavior_score: behaviorData?.session_metrics?.avg_session_duration_seconds || 0
    }
  };
}

/**
 * Assign user to A/B test variant
 */
export function assignABTestVariant(userId, activeTests, loanType) {
  // Find active test for this loan type
  const test = activeTests.find(t => 
    t.status === 'active' && 
    (t.loan_type === loanType || t.loan_type === 'all') &&
    t.current_sample_size < t.target_sample_size
  );

  if (!test) return null;

  // Use user ID hash for consistent assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (hash % 100) / 100;

  // Allocate based on traffic allocation
  let cumulative = 0;
  for (const variant of test.variants) {
    cumulative += variant.traffic_allocation / 100;
    if (random < cumulative) {
      return {
        testId: test.id,
        testKey: test.test_key,
        variantId: variant.variant_id,
        variantName: variant.name,
        strategy: variant.strategy
      };
    }
  }

  return null;
}