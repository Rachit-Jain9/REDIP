import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsAPI } from '../services/api';
import { toast } from '../components/common/Toast';

export function useDocuments(dealId, category) {
  return useQuery({
    queryKey: ['documents', dealId, category],
    queryFn: () => documentsAPI.list(dealId, category).then((r) => r.data),
    enabled: !!dealId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, formData }) => documentsAPI.upload(dealId, formData).then((r) => r.data),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['documents', dealId] });
      toast.success('Document uploaded');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed'),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, docId }) => documentsAPI.delete(dealId, docId),
    onSuccess: (_, { dealId }) => {
      qc.invalidateQueries({ queryKey: ['documents', dealId] });
      toast.success('Document deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });
}
