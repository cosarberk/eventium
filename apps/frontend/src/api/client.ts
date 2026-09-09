/**
 * @fileoverview urql GraphQL client and shared Socket.io instance.
 *
 * Real-time updates arrive over Socket.io's own `event:new` channel (see
 * `services/socket.service`), not through GraphQL subscriptions: the previous
 * `subscriptionExchange` bridged urql onto Socket.io with a message shape the
 * backend never handled, so it silently produced no data. The GraphQL transport
 * here is plain HTTP.
 *
 * `credentials: 'include'` is required — the session lives in an HTTP-only
 * cookie, and without it every authenticated query would be anonymous.
 */

import { io, type Socket } from 'socket.io-client';
import { Client, fetchExchange } from 'urql';
import { config } from '@/config';

/** Socket.io client instance shared across the application */
export const socket: Socket = io(config.wsUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  withCredentials: true,
});

/** Configured urql client instance for the application */
export const urqlClient = new Client({
  url: config.graphqlUrl,
  exchanges: [fetchExchange],
  requestPolicy: 'cache-and-network',
  fetchOptions: () => ({ credentials: 'include' }),
});
