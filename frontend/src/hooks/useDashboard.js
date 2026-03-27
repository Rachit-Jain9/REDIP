import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then((r) => r.data.data),
  });
}
