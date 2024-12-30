/**
 * @file /src/types/node.ts
 * @name Node
 * @description This file contains type definitions for nodes.
 */

import { Node as PMNode } from "@tiptap/pm/model";

export type NodePosArray = Array<NodePos>;
export type NodePos = { node: PMNode; pos: number };
