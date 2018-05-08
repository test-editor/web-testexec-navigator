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

  getTreeConfig() {
    return {
      onDoubleClick: (node) => { },
      onIconClick: (node) => { },
      onClick: (node) => { },
    };
  }

  getTree(): TreeNode {
    return { name: 'root',
      expanded: true,
      children: [ { name: 'child', expanded: true,
                    collapsedCssClasses: 'fa-chevron-right', expandedCssClasses: 'fa-chevron-down', leafCssClasses: 'fa-folder',
                    children: [
                      { name: 'grand-child',
                        collapsedCssClasses: 'fa-chevron-right', expandedCssClasses: 'fa-chevron-down', leafCssClasses: 'fa-folder',
                        children: [] }
                    ] },
                  { name: 'second-child', children: [] } ],
             collapsedCssClasses: 'fa-chevron-right', expandedCssClasses: 'fa-chevron-down', leafCssClasses: 'fa-folder' };
  }

}
