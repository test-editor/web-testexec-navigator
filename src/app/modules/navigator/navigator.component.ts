import { Component, OnInit, ChangeDetectorRef, Output, OnDestroy } from '@angular/core';
import { TreeNode } from '../tree-viewer/tree-node';
import { TreeViewerConfig } from '../tree-viewer/tree-viewer-config';
import { TestCaseService, CallTreeNode } from '../test-case-service/default.test.case.service';
import { MessagingService } from '@testeditor/messaging-service';
import { Subscription } from 'rxjs/Subscription';

const NAVIGATION_OPEN = 'navigation.open';
interface NavigationOpenPayload {
  name: string;
  path: string;
}
const EMPTY_TREE: TreeNode = { name: '<empty>', children: [] };

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.css']
})
export class NavigatorComponent implements OnInit, OnDestroy {

  @Output() treeNode: TreeNode = EMPTY_TREE;
  backendAsked: Boolean = false;
  navigationSubscription: Subscription;

  constructor(private messagingService: MessagingService,
              private testCaseService: TestCaseService,
              private changeDetectorRef: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.navigationSubscription = this.messagingService.subscribe(NAVIGATION_OPEN, (document: NavigationOpenPayload) => {
      if (document.path.endsWith('.tcl')) {
        this.updateTreeFor(document.path);
      } else {
        this.treeNode = EMPTY_TREE;
      }
    });
  }

  ngOnDestroy() {
    this.navigationSubscription.unsubscribe();
  }

  getTreeConfig() {
    return {
      onDoubleClick: (node) => { },
      onIconClick: (node) => { },
      onClick: (node) => { },
    };
  }

  updateTreeFor(path: string) {
    if (this.backendAsked) {
      console.log('backend was already called, skipping this call');
    } else {
      console.log('call backend for testexec call tree');
      this.testCaseService.getCallTree(
        path,
        (node) => {
          console.log('got testexec call tree answer from backend');
          console.log(node);
          this.treeNode = this.transformTreeNode(node);
          // this.changeDetectorRef.markForCheck(); // do this only if necessary
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

  private transformTreeNode(serviceNode: CallTreeNode): TreeNode {
    return { name: serviceNode.displayName,
             expanded: true,
             children: serviceNode.children.map((node) => this.transformTreeNode(node)),
             collapsedCssClasses: 'fa-chevron-right',
             expandedCssClasses: 'fa-chevron-down',
             leafCssClasses: 'fa-folder'
           };
  }

}
