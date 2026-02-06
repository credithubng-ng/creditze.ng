import React from 'react';
import { Brain, Shield, Activity, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ScoreDisplay({ scoreResult, showBreakdown = true }) {
  if (!scoreResult) return null;

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 75) return 'bg-emerald-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getRecommendationBadge = (rec) => {
    const styles = {
      approve: 'bg-emerald-100 text-emerald-700',
      review: 'bg-yellow-100 text-yellow-700',
      reject: 'bg-red-100 text-red-700'
    };
    return styles[rec] || 'bg-gray-100 text-gray-700';
  };

  const getConfidenceBadge = (conf) => {
    const styles = {
      high: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-orange-100 text-orange-700'
    };
    return styles[conf] || 'bg-gray-100 text-gray-700';
  };

  const componentIcons = {
    transaction_score: Wallet,
    behavioral_score: Activity,
    device_trust_score: Shield,
    identity_score: TrendingUp
  };

  const componentLabels = {
    transaction_score: 'Transaction',
    behavioral_score: 'Behavioral',
    device_trust_score: 'Device Trust',
    identity_score: 'Identity'
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI-Enhanced Score
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Combined score using rule-based criteria and ML analysis of transaction history, 
                  behavioral patterns, and device trust signals.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Scores */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className={`p-4 rounded-xl ${getScoreBg(scoreResult.combined_score)}`}>
            <p className="text-xs text-gray-500 mb-1">Combined</p>
            <p className={`text-3xl font-bold ${getScoreColor(scoreResult.combined_score)}`}>
              {scoreResult.combined_score}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-100">
            <p className="text-xs text-gray-500 mb-1">Rule-Based</p>
            <p className="text-2xl font-bold text-gray-700">{scoreResult.rule_based_score}</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50">
            <p className="text-xs text-gray-500 mb-1">ML Score</p>
            <p className="text-2xl font-bold text-purple-600">{scoreResult.ml_score}</p>
          </div>
        </div>

        {/* Recommendation & Confidence */}
        <div className="flex items-center justify-center gap-3">
          <Badge className={getRecommendationBadge(scoreResult.recommendation)}>
            {scoreResult.recommendation === 'approve' && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {scoreResult.recommendation === 'reject' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {scoreResult.recommendation?.toUpperCase()}
          </Badge>
          <Badge className={getConfidenceBadge(scoreResult.confidence_level)}>
            {scoreResult.confidence_level} confidence
          </Badge>
        </div>

        {/* ML Score Breakdown */}
        {showBreakdown && scoreResult.ml_score_breakdown && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">ML Score Components</p>
            <div className="space-y-3">
              {Object.entries(scoreResult.ml_score_breakdown).map(([key, value]) => {
                const Icon = componentIcons[key] || Activity;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span>{componentLabels[key] || key}</span>
                      </div>
                      <span className={`font-medium ${getScoreColor(value)}`}>{value}/100</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk Flags */}
        {scoreResult.risk_flags_detected?.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Risk Flags Detected
            </p>
            <div className="flex flex-wrap gap-2">
              {scoreResult.risk_flags_detected.map((flag, i) => (
                <Badge key={i} variant="outline" className="text-red-600 border-red-200">
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bonus Factors */}
        {scoreResult.bonus_factors_applied?.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Positive Factors
            </p>
            <div className="flex flex-wrap gap-2">
              {scoreResult.bonus_factors_applied.map((factor, i) => (
                <Badge key={i} variant="outline" className="text-emerald-600 border-emerald-200">
                  {factor.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        {scoreResult.explanation && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            {scoreResult.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}