import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialsAPI } from '../services/api';
import { toast } from '../components/common/Toast';

export function useFinancials(dealId) {
  return useQuery({
    queryKey: ['financials', dealId],
    queryFn: () => financialsAPI.get(dealId).then((r) => r.data.data),
    enabled: !!dealId,
  });
}

export function useCalculateFinancials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, data }) => financialsAPI.calculate(dealId, data).then((r) => r.data),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['financials', dealId] });
      qc.invalidateQueries({ queryKey: ['deal', dealId] });
      toast.success('Financials calculated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Calculation failed'),
  });
}

export function useRunSensitivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, data }) => financialsAPI.sensitivity(dealId, data).then((r) => r.data),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['financials', dealId] });
    },
  });
}
