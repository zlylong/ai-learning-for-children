'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WrongQuestionsClient } from './WrongQuestionsClient';
import { EmptyState } from './EmptyState';

export function WrongQuestionsWrapper() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedChildId');
    setChildId(savedId);
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!childId) {
    return (
      <EmptyState 
        title="错题本" 
        desc="请先选择孩子后再查看错题" 
        actionText="选择孩子" 
        onAction={() => router.push('/h5/children/select')}
      />
    );
  }

  return <WrongQuestionsClient childId={childId} />;
}
