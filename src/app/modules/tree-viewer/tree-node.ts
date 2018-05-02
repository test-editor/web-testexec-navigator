export interface TreeNode {
  name: string;
  children: TreeNode[];
  active?: boolean;
  selected?: boolean;
  expanded?: boolean;
  expandedStyle?: string;
  collapsedStyle?: string;
  leafStyle?: string;
}
