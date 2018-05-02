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
        case undefined: return this.model.leafStyle;
        case true: return this.model.expandedStyle;
        case false: return this.model.collapsedStyle;
      }
    } else {
      return 'fa-question';
    }
  }

}
