import apiClient from './apiClient';

export const fetchAgentStatus = async () => {
  const response = await apiClient.get('/agents/status');
  return response.data;
};
