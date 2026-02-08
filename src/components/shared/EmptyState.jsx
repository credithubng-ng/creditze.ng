import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}) {
  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardContent className="p-12 text-center">
        {Icon && <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
        {description && <p className="text-gray-500 mb-4">{description}</p>}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-emerald-600 hover:bg-emerald-700">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}