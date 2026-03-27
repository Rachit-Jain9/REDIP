import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsAPI } from '../services/api';
import { toast } from '../components/common/Toast';

export function useDeals(params = {}) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => dealsAPI.list(params).then((r) => r.data),
  });
}

export function useDeal(id) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsAPI.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: () => dealsAPI.getPipeline().then((r) => r.data.data),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => dealsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Deal created');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create deal'),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => dealsAPI.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['deal', id] });
      toast.success('Deal updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update deal'),
  });
}

export function useTransitionStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, notes }) => dealsAPI.transitionStage(id, stage, notes).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['deal', id] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Stage updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid stage transition'),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => dealsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Deal deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete deal'),
  });
}
