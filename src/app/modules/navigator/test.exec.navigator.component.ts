import { Component, OnInit, ChangeDetectorRef, Output, OnDestroy } from '@angular/core';
import { TreeNode, TreeViewerConfig } from '@testeditor/testeditor-commons';
import { TestCaseService, CallTreeNode } from '../test-case-service/default.test.case.service';
import { MessagingService } from '@testeditor/messaging-service';
import { Subscription } from 'rxjs/Subscription';
import { TestExecutionService, ExecutedCallTreeNode, ExecutedCallTree } from '../test-execution-service/test.execution.service';
import { TEST_NAVIGATION_SELECT } from './event-types';
import { TestRunId } from './test-run-id';

const NAVIGATION_OPEN = 'navigation.open';
const TEST_EXECUTION_FINISHED = 'test.execution.finished';

interface NavigationOpenPayload {
  name: string;
  path: string;
}
interface TestRunCompletedPayload {
  path: string;
  resourceURL: string;
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
    onClick: (node) => {
      node.expanded = !node.expanded;
      this.selectedNode = node;
      this.messagingService.publish(TEST_NAVIGATION_SELECT, node.id);
    }
  };

  private _selectedNode: TreeNode;

  navigationSubscription: Subscription;
  testRunCompletedSubscription: Subscription;
  runningNumber: number;

  constructor(private messagingService: MessagingService,
    private testCaseService: TestCaseService,
    private testExecutionService: TestExecutionService) {
  }

  get selectedNode(): TreeNode {
    return this._selectedNode;
  }

  set selectedNode(node: TreeNode) {
    if (this._selectedNode) {
      this._selectedNode.selected = false;
    }
    this._selectedNode = node;
    this._selectedNode.selected = true;
  }

  ngOnInit() {
    console.log('TestExecNavigatorComponent: subscribes for test execution finished');
    this.testRunCompletedSubscription = this.messagingService.subscribe(TEST_EXECUTION_FINISHED,
      (testSuiteRun: TestRunCompletedPayload) => this.loadExecutedTreeFor(testSuiteRun.path, testSuiteRun.resourceURL));
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

  // TODO: handle all test runs as opposed to just the first one (i.e. iterate executedCallTree.testRuns as opposed to using element [0])
  loadExecutedTreeFor(path: string, resourceURL: string): void {
    console.log('call backend for testexecution service');
    this.testCaseService.getCallTree(
      path,
      (node) => {
        console.log('got testexec call tree answer from backend');
        console.log(node);
        this.runningNumber = 0;
        this.treeNode = this.transformTreeNode(node);
        this.testExecutionService.getCallTree(resourceURL, (executedTree) => {
          console.log('get executed tree node');
          console.log(executedTree);
          executedTree.testRuns[0].children.forEach(child => this.updateExecutionStatus(child));
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
      if (!node.children) {
        if (node.enter && !node.leave && !node.status) {
          node.status = 'ERROR';
        }
      } else {
        let resultingStatus = 'OK';
        node.children.forEach(child => {
          this.updateExecutionStatus(child);
          if (child.status && child.status !== 'OK') {
            resultingStatus = child.status;
          }
        });
        if (!node.status) {
          node.status = resultingStatus;
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

  // TODO: handle all test runs as opposed to just the first one (i.e. iterate executedCallTree.testRuns as opposed to using element [0])
  private transformExecutionTree(executedCallTree: ExecutedCallTree): TreeNode {
    const rootID = new TestRunId(executedCallTree.testSuiteId, executedCallTree.testSuiteRunId, executedCallTree.testRuns[0].testRunId);
    return {
      name: 'Testrun: ' + executedCallTree.started,
      expanded: true,
      children: (executedCallTree.testRuns[0].children || []).map(node => this.transformExecutionNode(node, this.treeNode, rootID)),
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: rootID.toPathString(),
      hover: `Test Suite [Run] ID: ${executedCallTree.testSuiteId}[${executedCallTree.testSuiteRunId}]`
    };
  }

  private transformExecutionNode(executedCallTreeNode: ExecutedCallTreeNode,
    original: TreeNode, baseID: TestRunId): TreeNode {
    let originalChildren: TreeNode[];

    if (original) {
      originalChildren = original.children;
    }

    const statusClass = this.statusClass(executedCallTreeNode);
    let statusClassString = '';
    if (statusClass) {
      statusClassString = ' ' + statusClass;
    }

    const id = new TestRunId(baseID.testSuiteID, baseID.testSuiteRunID, baseID.testRunID, executedCallTreeNode.id);

    return {
      name: executedCallTreeNode.message,
      expanded: true,
      children: this.mergeChildTree(originalChildren, (executedCallTreeNode.children || []).map(
        (node, index) => {
          let originalNode: TreeNode;
          if (originalChildren && originalChildren.length > index) {
            originalNode = originalChildren[index];
          }
          return this.transformExecutionNode(node, originalNode, id);
        })),
      collapsedCssClasses: this.collapsedIcon(executedCallTreeNode) + statusClassString,
      expandedCssClasses: this.expandedIcon(executedCallTreeNode) + statusClassString,
      leafCssClasses: 'fa-folder',
      id: id.toPathString(),
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
    let result = executedCallTreeNode.id;

    if (executedCallTreeNode.node) {
      result = result + ', Type: ' + executedCallTreeNode.node;
    }

    result = result + ':';

    if (executedCallTreeNode.enter && executedCallTreeNode.leave) {
      result = result + ' executed ' + (Number(executedCallTreeNode.leave) - Number(executedCallTreeNode.enter)) / 1000 + 'ms';
    }

    const variables: String[] = new Array<String>();
    if (executedCallTreeNode.preVariables) {
      Object.keys(executedCallTreeNode.preVariables).forEach(key => {
        variables.push(key + ' = "' + executedCallTreeNode.preVariables[key] + '"');
      });
      result = result + ' with ' + variables.join(', ');
    }

    if (executedCallTreeNode.fixtureException) {
      result = result + '\n' + JSON.stringify(executedCallTreeNode.fixtureException);
    }

    return result;
  }

  private isLeaf(executedCallTreeNode: ExecutedCallTreeNode): boolean {
    return !executedCallTreeNode.children || executedCallTreeNode.children.length === 0;
  }

  private collapsedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.status) {
      if (executedCallTreeNode.status === 'OK') {
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
    } else if (executedCallTreeNode.enter || this.isLeaf(executedCallTreeNode)) {
      return 'fa-circle';
    } else {
      return 'fa-chevron-right';
    }
  }

  private expandedIcon(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.status) {
      if (executedCallTreeNode.status === 'OK') {
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
    } else if (executedCallTreeNode.enter || this.isLeaf(executedCallTreeNode)) {
      return 'fa-circle';
    } else {
      return 'fa-chevron-down';
    }
  }

  private statusClass(executedCallTreeNode: ExecutedCallTreeNode): string {
    if (executedCallTreeNode.status) {
      if (executedCallTreeNode.status === 'OK') {
        return 'tree-item-ok';
      } else {
        return 'tree-item-in-error';
      }
    } else {
      return undefined;
    }
  }

}
