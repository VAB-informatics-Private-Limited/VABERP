import { useQuery } from '@tanstack/react-query';
import { getUnitMasters } from '@/lib/api/unit-masters';

export function useUnits() {
  const { data, isLoading } = useQuery({
    queryKey: ['unit-masters'],
    queryFn: getUnitMasters,
    staleTime: 5 * 60 * 1000,
  });

  const units = (data?.data || [])
    .filter((u) => u.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return { units, isLoading };
}
