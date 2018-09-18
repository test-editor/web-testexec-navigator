import { Component, OnInit, ChangeDetectorRef, Output, OnDestroy, isDevMode } from '@angular/core';
import { TreeNode, TreeViewerConfig, forEach, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { TestCaseService, CallTreeNode } from '../test-case-service/default-test-case.service';
import { MessagingService } from '@testeditor/messaging-service';
import { Subscription } from 'rxjs/Subscription';
import { TestExecutionService, ExecutedCallTreeNode, ExecutedCallTree } from '../test-execution-service/test-execution.service';
import { TEST_NAVIGATION_SELECT, TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED } from '../event-types-out';
import { TestRunId } from './test-run-id';
import { TEST_EXECUTE_REQUEST, TEST_EXECUTION_FINISHED, NAVIGATION_OPEN,
  TestRunCompletedPayload, NavigationOpenPayload, TEST_SELECTED, TEST_CANCEL_REQUEST } from '../event-types-in';

export const EMPTY_TREE: TreeNode = { name: '<empty>', root: null, children: [] };

@Component({
  selector: 'app-testexec-navigator',
  templateUrl: './test-exec-navigator.component.html',
  styleUrls: ['./test-exec-navigator.component.css']
})
export class TestExecNavigatorComponent implements OnInit, OnDestroy {
  readonly cancelIcon = 'fa-stop';
  readonly executeIcon = 'fa-play';

  private runCancelButtonClass = this.executeIcon;
  private testExecutionSubscription: Subscription;
  private testExecutionFailedSubscription: Subscription;
  private testCancelSubscription: Subscription;
  private testPathSelected: string = null;

  @Output() treeNode: TreeNode = EMPTY_TREE;
  @Output() treeConfig: TreeViewerConfig = {
    onDoubleClick: (node) => { node.expanded = !node.expanded; },
    onIconClick: (node) => { node.expanded = !node.expanded; },
    onClick: (node) => {
      this.selectedNode = node;
      this.messagingService.publish(TEST_NAVIGATION_SELECT, node.id);
      this.log('sending TEST_NAVIGATION_SELECT', node.id);
    }
  };

  private _selectedNode: TreeNode;

  testSelectedSubscription: Subscription;
  testRunCompletedSubscription: Subscription;
  runningNumber: number;

  constructor(private messagingService: MessagingService,
    private testCaseService: TestCaseService,
    private testExecutionService: TestExecutionService) {
  }

  ngOnInit() {
    this.testRunCompletedSubscription =
      this.messagingService.subscribe(TEST_EXECUTION_FINISHED, (testSuiteRun: TestRunCompletedPayload) => {
        this.log('received ' + TEST_EXECUTION_FINISHED, testSuiteRun);
        this.loadExecutedTreeFor(testSuiteRun.path, testSuiteRun.resourceURL);
      });
    this.setupTestSelectedListener();
    this.setupTestExecutionListener();
  }

  ngOnDestroy() {
    this.testSelectedSubscription.unsubscribe();
    this.testRunCompletedSubscription.unsubscribe();
    this.testExecutionSubscription.unsubscribe();
    this.testCancelSubscription.unsubscribe();
    this.testExecutionFailedSubscription.unsubscribe();
  }

  setupTestSelectedListener() {
    this.testSelectedSubscription = this.messagingService.subscribe(TEST_SELECTED, (node: TreeNode) => {
      this.log('received ' + TEST_SELECTED, node);
      this.updateTreeFor(node.id);
      this.testPathSelected = node.id;
    });
  }

  setupTestExecutionListener(): void {
    this.testCancelSubscription = this.messagingService.subscribe(TEST_CANCEL_REQUEST, () => {
      this.log('received ' + TEST_CANCEL_REQUEST);
      this.handleCancelRequest();
    });
    this.testExecutionSubscription = this.messagingService.subscribe(TEST_EXECUTE_REQUEST, payload => {
      this.log('received ' + TEST_EXECUTE_REQUEST, payload);
      this.handleExecutionRequest(payload);
    });
    this.testExecutionSubscription = this.messagingService.subscribe(TEST_EXECUTION_STARTED, payload => {
      this.log('received ' + TEST_EXECUTION_STARTED, payload);
    });
    this.testExecutionFailedSubscription = this.messagingService.subscribe(TEST_EXECUTION_START_FAILED, payload => {
      this.log('received ' + TEST_EXECUTION_START_FAILED, payload);
    });
  }

  private log(msg: String, payload?) {
    if (isDevMode()) {
      console.log('TestExecNavigatorComponent: ' + msg);
      if (payload !== undefined) {
        console.log(payload);
      }
    }
  }

  handleCancelRequest(): void {
    // TODO: to be implemented
  }

  async handleExecutionRequest(tclPath: string) {
    try {
      this.testSelectedSubscription.unsubscribe();
      this.switchToTestCancelButton();
      const response = await this.testExecutionService.execute(tclPath);
      const payload = {
        path: tclPath,
        response: response,
        message: 'Execution of "\${}" has been started.'
      };
      this.messagingService.publish(TEST_EXECUTION_STARTED, payload);
      this.log('sending TEST_EXECUTION_STARTED', payload);
    } catch (reason) {
      this.switchToTestRunButton();
      const payload = {
        path: tclPath,
        reason: reason,
        message: 'The test "\${}" could not be started.'
      };
      this.messagingService.publish(TEST_EXECUTION_START_FAILED, payload);
      this.setupTestSelectedListener();
      this.log('sending TEST_EXECUTION_START_FAILED', payload);
    }
  }

  private switchToTestCancelButton(): void {
    this.runCancelButtonClass = this.cancelIcon;
  }

  private switchToTestRunButton(): void {
    this.runCancelButtonClass = this.executeIcon;
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

  // TODO: handle all test runs as opposed to just the first one (i.e. iterate executedCallTree.testRuns as opposed to using element [0])
  async loadExecutedTreeFor(path: string, resourceURL: string): Promise<void> {
    this.log('call backend for testexecution service');
    try {
      const callTreeNode = await this.testCaseService.getCallTree(path);
      this.log('got testexec call tree answer from backend', callTreeNode);
      this.runningNumber = 0;
      this.treeNode = this.transformTreeNode(callTreeNode);
      const executedTree = await this.testExecutionService.getCallTree(resourceURL);
      this.log('got executed tree node', executedTree);
      executedTree.testRuns[0].children.forEach(child => this.updateExecutionStatus(child));
      this.treeNode = this.transformExecutionTree(executedTree);
      this.treeNode.expanded = true;
      this.treeNode.children.forEach(child => this.updateExpansionStatus(child));
    } catch (error) {
      this.log('ERROR', error);
    }
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

  async updateTreeFor(path: string): Promise<void> {
    this.log('call backend for testexec call tree');
    try {
      const callTreeNode = await this.testCaseService.getCallTree(path);
      this.log('got testexec call tree answer from backend', callTreeNode);
      this.runningNumber = 0;
      this.treeNode = this.transformTreeNode(callTreeNode);
    } catch (error) {
      this.log('ERROR', error);
    }
  }

  private transformTreeNode(serviceNode: CallTreeNode, root?: TreeNode): TreeNode {
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
    const result: TreeNode = {
      name: serviceNode.displayName,
      expanded: true,
      root: null, // initialized later (see below)
      children: [], // initialized after root was set
      collapsedCssClasses: collapsedCssClass,
      expandedCssClasses: expandedCssClass,
      leafCssClasses: leafCssClass,
      id: 'ID' + nodeNumber,
      hover: 'ID' + nodeNumber + ':'
    };
    if (root === undefined) {
      result.root = result;
    } else {
      result.root = root;
    }
    result.children =  serviceNode.children.map(node => this.transformTreeNode(node, result.root));
    return result;
  }

  // TODO: handle all test runs as opposed to just the first one (i.e. iterate executedCallTree.testRuns as opposed to using element [0])
  private transformExecutionTree(executedCallTree: ExecutedCallTree, root?: TreeNode): TreeNode {
    const rootID = new TestRunId(executedCallTree.testSuiteId, executedCallTree.testSuiteRunId, executedCallTree.testRuns[0].testRunId);
    const result: TreeNode = {
      name: 'Testrun: ' + executedCallTree.started,
      expanded: true,
      root: null, // initialized later (see below)
      children: [], // initialized after root was set
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: rootID.toPathString(),
      hover: `Test Suite [Run] ID: ${executedCallTree.testSuiteId}[${executedCallTree.testSuiteRunId}]`
    };
    if (root === undefined) {
      result.root = result;
    } else {
      result.root = root;
    }
    result.children = (executedCallTree.testRuns[0].children || [])
      .map(node => this.transformExecutionNode(node, this.treeNode, rootID, result.root));
    return result;
  }

  private transformExecutionNode(executedCallTreeNode: ExecutedCallTreeNode,
                                 original: TreeNode, baseID: TestRunId, root: TreeNode): TreeNode {
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

    const result: TreeNode = {
      name: executedCallTreeNode.message,
      expanded: true,
      root: root, // initialized later (see below)
      children: this.mergeChildTree(originalChildren, (executedCallTreeNode.children || []).map(
        (node, index) => {
          let originalNode: TreeNode;
          if (originalChildren && originalChildren.length > index) {
            originalNode = originalChildren[index];
          }
          return this.transformExecutionNode(node, originalNode, id, root);
        })),
      collapsedCssClasses: this.collapsedIcon(executedCallTreeNode) + statusClassString,
      expandedCssClasses: this.expandedIcon(executedCallTreeNode) + statusClassString,
      leafCssClasses: 'fa-folder',
      id: id.toPathString(),
      hover: this.hoverFor(executedCallTreeNode)
    };
    return result;
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

  /** controls availability of test execution button */
  selectionIsExecutable(): boolean {
    return this.testPathSelected != null;
  }

  testIsRunning(): boolean {
    return this.runCancelButtonClass !== this.executeIcon; // TODO: <-- change that
  }

  run(): void {
    if (this.selectionIsExecutable()) {
      if (this.testIsRunning()) {
        this.messagingService.publish(TEST_CANCEL_REQUEST, null);
        this.log('published ' + TEST_CANCEL_REQUEST);
      } else {
        this.messagingService.publish(TEST_EXECUTE_REQUEST, this.testPathSelected);
        this.log('published ' + TEST_EXECUTE_REQUEST, this.testPathSelected);
      }
    } else {
      this.log('WARNING: trying to execute/stop test, but no test case file is selected/running.');
    }
  }

  getExecuteButtonTitle(): string {
    if (this.testIsRunning()) {
      return 'cancel test';
    } else {
      return 'execute test';
    }
  }

  collapseAll(): void {
  }

}
