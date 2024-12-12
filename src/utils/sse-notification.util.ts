import type { SSEClient } from 'src/types/types';

export const sseClients: SSEClient[] = [];

export const sendSSEMessage = (clientId: string, message: string) => {
  const client = sseClients.find((client) => client.id === clientId);

  if (client) {
    client.response.write(`data: ${message}\n\n`);
    client.response.flush();
  }
};
