import { TreeNode } from './tree-node';

export interface TreeViewerConfig {
  onClick?: (node: TreeNode) => void;
  onDoubleClick?: (node: TreeNode) => void;
  onIconClick?: (node: TreeNode) => void;
}
