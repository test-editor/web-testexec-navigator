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
  @Output() treeConfig: TreeViewerConfig = {
    onDoubleClick: (node) => { },
    onIconClick: (node) => { node.expanded = !node.expanded; },
    onClick: (node) => { node.expanded = !node.expanded; }
  };
  navigationSubscription: Subscription;
  testRunCompletedSubscription: Subscription;
  runningNumber: number;

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

  loadExecutedTreeFor(path: string): void {
    console.log('call backend for testexecution service');
    this.testCaseService.getCallTree(
      path,
      (node) => {
        console.log('got testexec call tree answer from backend');
        console.log(node);
        this.runningNumber = 0;
        this.treeNode = this.transformTreeNode(node);
        this.testExecutionService.getCallTree(path, (executedTree) => {
          console.log('get executed tree node');
          console.log(executedTree);
          executedTree.Children.forEach(child => this.updateExecutionStatus(child));
          this.treeNode = this.transformExecutionTree(executedTree);
          this.treeNode.expanded = true;
          this.treeNode.children.forEach(child => this.updateExpansionStatus(child));
        });
      },
      (error) => {
        console.log(error);
      }
    );
  }

  private updateExpansionStatus(node: TreeNode) {
    node.expanded = !new RegExp('.*tree-item-ok.*').test(node.expandedCssClasses);
    node.children.forEach(child => this.updateExpansionStatus(child));
  }

  private updateExecutionStatus(node: ExecutedCallTreeNode) {
    if (node) {
      if (!node.Children) {
        if (node.Enter && !node.Leave && !node.Status) {
          node.Status = 'ERROR';
        }
      } else {
        let resultingStatus = 'OK';
        node.Children.forEach(child => {
          this.updateExecutionStatus(child);
          if (child.Status && child.Status !== 'OK') {
            resultingStatus = child.Status;
          }
        });
        if (!node.Status) {
          node.Status = resultingStatus;
        }
      }
    }
  }

  updateTreeFor(path: string): void {
    console.log('call backend for testexec call tree');
    this.testCaseService.getCallTree(
      path,
      (node) => {
        console.log('got testexec call tree answer from backend');
        console.log(node);
        this.runningNumber = 0;
        this.treeNode = this.transformTreeNode(node);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  private transformTreeNode(serviceNode: CallTreeNode): TreeNode {
    const nodeNumber = this.runningNumber;
    this.runningNumber++;
    const isLeaf = !serviceNode.children || serviceNode.children.length === 0;
    let expandedCssClass: string;
    let collapsedCssClass: string;
    let leafCssClass: string;
    if (isLeaf) {
      collapsedCssClass = 'fa-circle';
      expandedCssClass = 'fa-circle';
      leafCssClass = 'fa-circle';
    } else {
      collapsedCssClass = 'fa-chevron-right';
      expandedCssClass = 'fa-chevron-down';
      leafCssClass = 'fa-folder';
    }
    return {
      name: serviceNode.displayName,
      expanded: true,
      children: serviceNode.children.map(node => this.transformTreeNode(node)),
      collapsedCssClasses: collapsedCssClass,
      expandedCssClasses: expandedCssClass,
      leafCssClasses: leafCssClass,
      id: 'ID' + nodeNumber,
      hover: 'ID' + nodeNumber + ':'
    };
  }

  private transformExecutionTree(executedCallTree: ExecutedCallTree): TreeNode {
    return {
      name: 'Testrun: ' + executedCallTree.Started,
      expanded: true,
      children: (executedCallTree.Children || []).map(node => this.transformExecutionNode(node, this.treeNode)),
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: 'IDTR',
      hover: 'CommitID:' + executedCallTree.CommitID
    };
  }

  private transformExecutionNode(executedCallTreeNode: ExecutedCallTreeNode, original: TreeNode): TreeNode {
    let originalChildren: TreeNode[];

    if (original) {
      originalChildren = original.children;
    }

    const statusClass = this.statusClass(executedCallTreeNode);
    let statusClassString = '';
    if (statusClass) {
      statusClassString = ' ' + statusClass;
    }

    return {
      name: executedCallTreeNode.Message,
      expanded: true,
      children: this.mergeChildTree(originalChildren, (executedCallTreeNode.Children || []).map(
        (node, index) => {
          let originalNode: TreeNode;
          if (originalChildren && originalChildren.length > index) {
            originalNode = originalChildren[index];
          }
          return this.transformExecutionNode(node, originalNode);
        })),
      collapsedCssClasses: this.collapsedIcon(executedCallTreeNode) + statusClassString,
      expandedCssClasses: this.expandedIcon(executedCallTreeNode) + statusClassString,
      leafCssClasses: 'fa-folder',
      id: executedCallTreeNode.ID,
      hover: this.hoverFor(executedCallTreeNode)
    };
  }

  private mergeChildTree(originalChildren: TreeNode[], childrenUpdate: TreeNode[]): TreeNode[] {
    // initial naiive implementation to merge the children with planned executions
    if (originalChildren && originalChildren.length > childrenUpdate.length) {
      return childrenUpdate.concat(originalChildren.splice(childrenUpdate.length));
    }
    return childrenUpdate;
  }

  private hoverFor(executedCallTreeNode: ExecutedCallTreeNode): string {
    let result = executedCallTreeNode.ID;

    if (executedCallTreeNode.Type) {
      result = result + ', Type: ' + executedCallTreeNode.Type;
    }

    result = result + ':';

    if (executedCallTreeNode.Enter && executedCallTreeNode.Leave) {
      result = result + ' executed ' + (Number(executedCallTreeNode.Leave) - Number(executedCallTreeNode.Enter)) / 1000 + 'ms';
    }

    const variables: String[] = new Array<String>();
    if (executedCallTreeNode.PreVariables) {
      Object.keys(executedCallTreeNode.PreVariables).forEach(key => {
        variables.push(key + ' = "' + executedCallTreeNode.PreVariables[key] + '"');
      });
      result = result + ' with ' + variables.join(', ');
    }

    if (executedCallTreeNode.FixtureException) {
      result = result + '\n' + JSON.stringify(executedCallTreeNode.FixtureException);
    }

    return result;
  }

  private isLeaf(executedCallTreeNode: ExecutedCallTreeNode): boolean {
    return !executedCallTreeNode.Children || executedCallTreeNode.Children.length === 0;
  }

  private collapsedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.Status) {
      if (executedCallTreeNode.Status === 'OK') {
        if (this.isLeaf(executedCallTreeNode)) {
          return 'fa-circle';
        } else {
          return 'fa-chevron-circle-right';
        }
      } else {
        if (this.isLeaf(executedCallTreeNode)) {
          return 'fa-times-circle';
        } else {
          return 'fa-times-rectangle';
        }
      }
    } else if (executedCallTreeNode.Enter || this.isLeaf(executedCallTreeNode)) {
      return 'fa-circle';
    } else {
      return 'fa-chevron-right';
    }
  }

  private expandedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.Status) {
      if (executedCallTreeNode.Status === 'OK') {
        if (this.isLeaf(executedCallTreeNode)) {
          return 'fa-circle';
        } else {
          return 'fa-chevron-circle-down';
        }
      } else {
        if (this.isLeaf(executedCallTreeNode)) {
          return 'fa-times-circle';
        } else {
          return 'fa-times-rectangle';
        }
      }
    } else if (executedCallTreeNode.Enter || this.isLeaf(executedCallTreeNode)) {
      return 'fa-circle';
    } else {
      return 'fa-chevron-down';
    }
  }

  private statusClass(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.Status) {
      if (executedCallTreeNode.Status === 'OK') {
        return 'tree-item-ok';
      } else {
        return 'tree-item-in-error';
      }
    } else {
      return undefined;
    }
  }

}
