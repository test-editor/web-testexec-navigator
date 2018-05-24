import { Component, OnInit, Input } from '@angular/core';
import { TreeNode } from './tree-node';
import { TreeViewerConfig } from './tree-viewer-config';

@Component({
  selector: 'app-tree-viewer',
  templateUrl: './tree-viewer.component.html',
  styleUrls: ['./tree-viewer.component.css']
})
export class TreeViewerComponent implements OnInit {

  @Input() model: TreeNode;
  @Input() level = 0;
  @Input() config: TreeViewerConfig;

  constructor() { }

  ngOnInit() {
  }

  get icon(): string {
    if (this.model) {
      switch (this.model.expanded) {
        case undefined: return this.model.leafCssClasses;
        case true: return this.model.expandedCssClasses;
        case false: return this.model.collapsedCssClasses;
      }
    } else {
      return 'fa-question';
    }
  }

  onClick(node: TreeNode) {
    if (this.config.onClick) {
      this.config.onClick(node);
    }
  }

  onIconClick(node: TreeNode) {
    if (this.config.onIconClick) {
      this.config.onIconClick(node);
    }
  }

  onDoubleClick(node: TreeNode) {
    if (this.config.onDoubleClick) {
      this.config.onDoubleClick(node);
    }
  }

}
