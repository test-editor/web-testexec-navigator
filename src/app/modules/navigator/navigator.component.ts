import { Component, OnInit } from '@angular/core';
import { TreeNode } from '../tree-viewer/tree-node';
import { TreeViewerConfig } from '../tree-viewer/tree-viewer-config';

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.css']
})
export class NavigatorComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  getTree(): TreeNode {
    return { name: 'root', children: [] };
  }

  getTreeConfig(): TreeViewerConfig {
    return {
      onDoubleClick: (node) => { },
      onIconClick: (node) => { },
      onClick: (node) => { },
    };
  }

}
