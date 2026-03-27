import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesAPI } from '../services/api';
import { toast } from '../components/common/Toast';

export function useActivities(dealId, params = {}) {
  return useQuery({
    queryKey: ['activities', dealId, params],
    queryFn: () => activitiesAPI.list(dealId, params).then((r) => r.data),
    enabled: !!dealId,
  });
}

export function useRecentActivities(limit = 20) {
  return useQuery({
    queryKey: ['activities', 'recent', limit],
    queryFn: () => activitiesAPI.recent(limit).then((r) => r.data.data),
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, data }) => activitiesAPI.create(dealId, data).then((r) => r.data),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['activities', dealId] });
      qc.invalidateQueries({ queryKey: ['activities', 'recent'] });
      qc.invalidateQueries({ queryKey: ['deal', dealId] });
      toast.success('Activity logged');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to log activity'),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityId) => activitiesAPI.delete(activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Activity deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete activity'),
  });
}
