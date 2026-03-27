import { useQuery } from '@tanstack/react-query';
import { intelligenceAPI } from '../services/api';

export function useDailyBrief(date) {
  return useQuery({
    queryKey: ['intelligence', 'daily-brief', date || 'today'],
    queryFn: () => intelligenceAPI.getDailyBrief(date).then((response) => response.data.data),
  });
}
