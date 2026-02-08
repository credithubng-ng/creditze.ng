import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ErrorMessage({ title, message, variant = 'destructive', className }) {
  const Icon = variant === 'destructive' ? XCircle : AlertCircle;

  return (
    <Alert variant={variant} className={cn(className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}