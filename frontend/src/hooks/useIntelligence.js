import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceAPI } from '../services/api';

export function useDailyBrief(date) {
  return useQuery({
    queryKey: ['intelligence', 'daily-brief', date || 'today'],
    queryFn: () => intelligenceAPI.getDailyBrief(date).then((response) => response.data.data),
  });
}

export function useMarketNotes() {
  return useQuery({
    queryKey: ['intelligence', 'market-notes'],
    queryFn: () => intelligenceAPI.getMarketNotes().then((res) => res.data.data),
  });
}

export function useSaveMarketNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ section, items }) => intelligenceAPI.saveMarketNotes(section, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence'] });
    },
  });
}

export function useMarketTransactions(params) {
  return useQuery({
    queryKey: ['intelligence', 'market-transactions', params],
    queryFn: () => intelligenceAPI.getMarketTransactions(params).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMicroMarketBenchmarks(params) {
  return useQuery({
    queryKey: ['intelligence', 'micro-market-benchmarks', params],
    queryFn: () => intelligenceAPI.getMicroMarketBenchmarks(params).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
