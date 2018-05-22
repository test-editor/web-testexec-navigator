import { Component, OnInit, ChangeDetectorRef, Output, OnDestroy } from '@angular/core';
import { TreeNode } from '../tree-viewer/tree-node';
import { TreeViewerConfig } from '../tree-viewer/tree-viewer-config';
import { TestCaseService, CallTreeNode } from '../test-case-service/default.test.case.service';
import { MessagingService } from '@testeditor/messaging-service';
import { Subscription } from 'rxjs/Subscription';
import { TestExecutionService, ExecutedCallTreeNode, ExecutedCallTree } from '../test-execution-service/test.execution.service';

const NAVIGATION_OPEN = 'navigation.open';
const TEST_EXECUTION_FINISHED = 'test.execution.finished';

interface NavigationOpenPayload {
  name: string;
  path: string;
}
interface TestRunCompletedPayload {
  path: string;
}

const EMPTY_TREE: TreeNode = { name: '<empty>', children: [] };

@Component({
  selector: 'app-testexec-navigator',
  templateUrl: './test.exec.navigator.component.html',
  styleUrls: ['./test.exec.navigator.component.css']
})
export class TestExecNavigatorComponent implements OnInit, OnDestroy {

  @Output() treeNode: TreeNode = EMPTY_TREE;
  navigationSubscription: Subscription;
  testRunCompletedSubscription: Subscription;

  constructor(private messagingService: MessagingService,
              private testCaseService: TestCaseService,
              private testExecutionService: TestExecutionService) {
  }

  ngOnInit() {
    console.log('TestExecNavigatorComponent: subscribes for test execution finished');
    this.testRunCompletedSubscription = this.messagingService.subscribe(TEST_EXECUTION_FINISHED, (testRun: TestRunCompletedPayload) => {
      this.loadExecutedTreeFor(testRun.path);
    });
    console.log('TestExecNavigatorComponent: subscribes for navigation open');
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
    this.testRunCompletedSubscription.unsubscribe();
  }

  getTreeConfig() {
    return {
      onDoubleClick: (node) => { },
      onIconClick: (node) => { },
      onClick: (node) => { },
    };
  }

  loadExecutedTreeFor(path: string) {
    console.log('call backend for testexecution service');
    this.testExecutionService.getCallTree(path, (node) => {
      console.log('get executed tree node');
      console.log(node);
      this.treeNode = this.transformExecutionTree(node);
    });
  }

  updateTreeFor(path: string) {
    console.log('call backend for testexec call tree');
    this.testCaseService.getCallTree(
      path,
      (node) => {
        console.log('got testexec call tree answer from backend');
        console.log(node);
        this.treeNode = this.transformTreeNode(node, 1);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  private transformTreeNode(serviceNode: CallTreeNode, idNum: number): TreeNode {
    return { name: serviceNode.displayName,
             expanded: true,
             children: serviceNode.children.map((node) => { idNum += 1; return this.transformTreeNode(node, idNum)}),
             collapsedCssClasses: 'fa-chevron-right',
             expandedCssClasses: 'fa-chevron-down',
             leafCssClasses: 'fa-folder',
             id: 'ID' + idNum
           };
  }


  private transformExecutionTree(executedCallTree: ExecutedCallTree): TreeNode {
    return { name: executedCallTree.Source,
             expanded: true,
             children: (executedCallTree.Children || []).map(node => this.transformExecutionNode(node, this.treeNode)),
             collapsedCssClasses: 'fa-chevron-right',
             expandedCssClasses: 'fa-chevron-down',
             leafCssClasses: 'fa-folder',
             hover: 'CommitID:' + executedCallTree.CommitID
           };
  }

  private transformExecutionNode(executedCallTreeNode: ExecutedCallTreeNode, original: TreeNode): TreeNode {
    return { name: executedCallTreeNode.Message,
             expanded: true,
             children: this.mergeChildTree(original.children, (executedCallTreeNode.Children || []).map(
               (node, index) => this.transformExecutionNode(node, original.children[index]))),
             collapsedCssClasses: this.collapsedIcon(executedCallTreeNode),
             expandedCssClasses: this.expandedIcon(executedCallTreeNode),
             leafCssClasses: 'fa-folder',
             hover: this.hoverFor(executedCallTreeNode)
           };
  }

  private mergeChildTree(originalChildren: TreeNode[], childrenUpdate: TreeNode[]): TreeNode[] {
    if (originalChildren.length === childrenUpdate.length) {
      return childrenUpdate;
    } else if (originalChildren.length > childrenUpdate.length) {
      return childrenUpdate.concat(originalChildren.splice(childrenUpdate.length));
    }

    return originalChildren;
  }

  private hoverFor(executedCallTreeNode: ExecutedCallTreeNode): string {
    let result = executedCallTreeNode.ID + ':';
    if (executedCallTreeNode.Enter && executedCallTreeNode.Leave) {
      result = result + ' executed ' + (Number(executedCallTreeNode.Leave) - Number(executedCallTreeNode.Enter)) / 1000 + 'ms';
    }

    return result;
  }

  private collapsedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.Status) {
      if (executedCallTreeNode.Status === 'OK') {
        return 'fa-chevron-circle-right tree-item-ok';
      } else {
        return 'fa-times-circle tree-item-in-error';
      }
    } else if (executedCallTreeNode.Enter) {
      return 'fa-circle';
    }
    return 'fa-chevron-right';
  }

  private expandedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.Status) {
      if (executedCallTreeNode.Status === 'OK') {
        return 'fa-chevron-circle-down tree-item-ok';
      } else {
        return 'fa-times-circle tree-item-in-error';
      }
    } else if (executedCallTreeNode.Enter) {
      return 'fa-circle';
    }
    return 'fa-chevron-down';
  }

}
