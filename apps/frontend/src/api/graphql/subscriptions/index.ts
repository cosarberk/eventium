/**
 * @fileoverview GraphQL subscription definitions matching the backend schema exactly.
 */
import { gql } from 'urql';

/** Subscribes to real-time events, optionally scoped to a plugin instance */
export const ON_EVENT = gql`
  subscription OnEvent($pluginInstanceId: String) {
    onEvent(pluginInstanceId: $pluginInstanceId) {
      id
      pluginInstanceId
      pluginInstance {
        id
        pluginId
        name
      }
      eventType
      title
      description
      payload
      severity
      createdAt
    }
  }
`;
