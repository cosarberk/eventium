/**
 * @fileoverview Service layer for the project file-system tree (nodes).
 */
import { urqlClient } from '@/api/client';
import {
  CREATE_NODE,
  DELETE_NODE,
  GET_NODES,
  MOVE_NODE,
  RENAME_NODE,
  SET_NODE_DATA,
} from '@/api/graphql';
import type { ProjectNode } from '@/types';

/** Fetch a project's tree (flat list). */
export async function fetchNodes(projectId: string): Promise<ProjectNode[]> {
  const result = await urqlClient.query(GET_NODES, { projectId }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return (result.data?.nodes ?? []) as ProjectNode[];
}

/** Create a folder or typed file. */
export async function createNode(input: {
  projectId: string;
  parentId?: string | null;
  kind: string;
  name: string;
}): Promise<ProjectNode> {
  const result = await urqlClient.mutation(CREATE_NODE, { input }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.createNode as ProjectNode;
}

/** Rename a node. */
export async function renameNode(id: string, name: string): Promise<ProjectNode> {
  const result = await urqlClient.mutation(RENAME_NODE, { id, name }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.renameNode as ProjectNode;
}

/** Move a node under a new parent. */
export async function moveNode(
  id: string,
  parentId: string | null,
  order: number,
): Promise<ProjectNode> {
  const result = await urqlClient.mutation(MOVE_NODE, { id, parentId, order }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.moveNode as ProjectNode;
}

/** Delete a node and its descendants. */
export async function deleteNode(id: string): Promise<{ id: string }> {
  const result = await urqlClient.mutation(DELETE_NODE, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.deleteNode as { id: string };
}

/** Replace a non-page file node's content JSON. */
export async function updateNodeData(
  id: string,
  data: Record<string, unknown>,
): Promise<ProjectNode> {
  const result = await urqlClient.mutation(SET_NODE_DATA, { id, data }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.setNodeData as ProjectNode;
}
