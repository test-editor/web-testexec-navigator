import { Component, OnInit, ChangeDetectorRef, Output, OnDestroy, isDevMode } from '@angular/core';
import { TreeNode, TreeViewerConfig, forEach, TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { TestCaseService, CallTreeNode } from '../test-case-service/default-test-case.service';
import { MessagingService } from '@testeditor/messaging-service';
import { Subscription } from 'rxjs/Subscription';
import { TestSuiteExecutionStatus, TestExecutionService,
         ExecutedCallTreeNode, ExecutedCallTree } from '../test-execution-service/test-execution.service';
import { TestExecutionState } from '../test-execution-service/test-execution-state';
import { TEST_NAVIGATION_SELECT, TEST_EXECUTION_STARTED, TEST_EXECUTION_START_FAILED, TEST_EXECUTION_TREE_LOADED,
         TestRunCompletedPayload, TEST_EXECUTION_FINISHED, TEST_EXECUTION_FAILED } from '../event-types-out';
import { TEST_EXECUTE_REQUEST, NAVIGATION_OPEN,
         NavigationOpenPayload, TEST_SELECTED, TEST_CANCEL_REQUEST } from '../event-types-in';
import { TestRunId } from './test-run-id';
import { Subject } from 'rxjs/Subject';
import { idPrefix } from '../module-constants';

export const EMPTY_TREE: TreeNode = { name: '<empty>', root: null, children: [] };

export type UITestRunStatus = 'running'| 'successful' | 'failure';
export interface UITestRun {
  cssClass: UITestRunStatus;
  displayName: string;
  executingTclPaths: string[];
  testSuitRunResourceUrl: string;
}

@Component({
  selector: 'app-testexec-navigator',
  templateUrl: './test-exec-navigator.component.html',
  styleUrls: ['./test-exec-navigator.component.css']
})
export class TestExecNavigatorComponent implements OnInit, OnDestroy {
  readonly cancelIcon = 'fa-stop pulse';
  readonly executeIcon = 'fa-play';
  readonly idPrefix = idPrefix;

  private runCancelButtonClass = this.executeIcon;
  private testExecutionSubscription: Subscription;
  private testExecutionFailedSubscription: Subscription;
  private testCancelSubscription: Subscription;
  private testPathSelected: string = null;
  private testRunList: UITestRun[] = [ ];
  @Output() treeNode: TreeNode = EMPTY_TREE;
  @Output() treeConfig: TreeViewerConfig = {
    onDoubleClick: (node) => { node.expanded = !node.expanded; },
    onIconClick: (node) => { node.expanded = !node.expanded; },
    onClick: (node) => {
      this.selectedNode = node;
      this.messagingService.publish(TEST_NAVIGATION_SELECT, node.id);
      this.log('sending TEST_NAVIGATION_SELECT for executed node', node.id);
    }
  };

  private _selectedNode: TreeNode;

  testSelectedSubscription: Subscription;
  testRunCompletedSubscription: Subscription;
  testRunFailedSubscription: Subscription;
  runningNumber: number;

  constructor(private messagingService: MessagingService,
    private testCaseService: TestCaseService,
    private testExecutionService: TestExecutionService) {
  }

  ngOnInit() {
    this.setupTestExecutionFinishedListener();
    this.setupTestSelectedListener();
    this.setupTestExecutionListener();
  }

  ngOnDestroy() {
    this.testSelectedSubscription.unsubscribe();
    this.testRunCompletedSubscription.unsubscribe();
    this.testExecutionSubscription.unsubscribe();
    this.testCancelSubscription.unsubscribe();
    this.testExecutionFailedSubscription.unsubscribe();
    this.testRunFailedSubscription.unsubscribe();
  }

  setupTestSelectedListener() {
    this.testSelectedSubscription = this.messagingService.subscribe(TEST_SELECTED, (node: TreeNode) => {
      this.log('received ' + TEST_SELECTED, node);
      if (!this.testIsRunning()) {
        this.updateTreeFor(node.id);
        this.testPathSelected = node.id;
      }
    });
  }

  setupTestExecutionFinishedListener(): void {
    this.testRunCompletedSubscription =
      this.messagingService.subscribe(TEST_EXECUTION_FINISHED, (testSuiteRun: TestRunCompletedPayload) => {
        this.log('received ' + TEST_EXECUTION_FINISHED, testSuiteRun);
        this.loadExecutedTreeFor(testSuiteRun.path, testSuiteRun.resourceURL, true);
        this.switchToIdleStatus();
      });
    this.testRunFailedSubscription =
      this.messagingService.subscribe(TEST_EXECUTION_FAILED, (testSuiteRun: TestRunCompletedPayload) => {
        this.log('received ' + TEST_EXECUTION_FAILED, testSuiteRun);
        this.loadExecutedTreeFor(testSuiteRun.path, testSuiteRun.resourceURL, true);
        this.switchToIdleStatus();
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
    this.log('ERROR: cancel running test not implemented yet');
  }

  buildUITestRunFromSingleTest(tclPath: string, executingTestResourceUrl: string, date: Date): UITestRun {
    const shortenedTestPath = (tclPath.startsWith('src/test/java/') && (tclPath.endsWith('.tcl'))) ?
      tclPath.substring(14, tclPath.length - 4) : tclPath;
    const paths = shortenedTestPath.split('/');
    const testNameOnly = paths.pop();
    const name = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      + ' ' + testNameOnly + ' (' + paths.join('.') + ')';
    return  { displayName: name, testSuitRunResourceUrl: executingTestResourceUrl, executingTclPaths: [ tclPath ], cssClass: 'running' };
  }

  addTestRun(testRun: UITestRun) {
    this.testRunList.unshift(testRun);
  }

  async handleExecutionRequest(tclPath: string) {
    try {
      this.switchToTestCurrentlyRunningStatus();
      const executingTestResourceUrl = await this.testExecutionService.execute(tclPath);
      const payload = {
        path: tclPath,
        response: executingTestResourceUrl,
        message: 'Execution of "\${}" has been started.'
      };
      this.messagingService.publish(TEST_EXECUTION_STARTED, payload);
      this.log('sending TEST_EXECUTION_STARTED', payload);
      const testRunItem = this.buildUITestRunFromSingleTest(tclPath, executingTestResourceUrl, new Date());
      this.addTestRun(testRunItem);
      const finalExecutionStatus = await this.testExecutionWatcher(executingTestResourceUrl, tclPath);
      testRunItem.cssClass = finalExecutionStatus.status === TestExecutionState.LastRunSuccessful ?
        'successful' : 'failure';
      this.switchToIdleStatus();
    } catch (reason) {
      this.switchToIdleStatus();
      const payload = {
        path: tclPath,
        reason: reason,
        message: 'The test "\${}" could not be started.'
      };
      this.messagingService.publish(TEST_EXECUTION_START_FAILED, payload);
      this.log('sending TEST_EXECUTION_START_FAILED', payload);
    }
  }

  async testExecutionWatcher(testId: string, tclPath: string): Promise<TestSuiteExecutionStatus> {
    let suiteStatus: TestSuiteExecutionStatus;
    let executionStatus = TestExecutionState.Running;
    while (executionStatus === TestExecutionState.Running) {
      this.log('polling test status from', testId);
      suiteStatus = await this.testExecutionService.getStatus(testId);
      this.log('got status', suiteStatus);
      executionStatus = suiteStatus.status;
      this.log('updating execution tree');
      await this.loadExecutedTreeFor(tclPath, testId);
   }
    this.log('got final test status', suiteStatus);
    const result: TestRunCompletedPayload = {
      path: tclPath,
      resourceURL: testId
    };
    switch (executionStatus) {
      case TestExecutionState.LastRunFailed: {
        this.messagingService.publish(TEST_EXECUTION_FAILED, result);
        break;
      }
      case TestExecutionState.LastRunSuccessful: {
        this.messagingService.publish(TEST_EXECUTION_FINISHED, result);
        break;
      }
      default: {
        this.log('ERROR: test execution ended neither successful nor did it fail', suiteStatus);
      }
    }
    return suiteStatus;
  }

  /** visible for testing */
  public switchToTestCurrentlyRunningStatus(): void {
    this.testSelectedSubscription.unsubscribe();
    this.runCancelButtonClass = this.cancelIcon;
  }

  /** visible for testing */
  public switchToIdleStatus(): void {
    this.runCancelButtonClass = this.executeIcon;
    this.setupTestSelectedListener();
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
  async loadExecutedTreeFor(path: string, resourceURL: string, updateExecutionStatus?: boolean): Promise<void> {
    this.log('call backend for testexecution service');
    try {
      const callTreeNode = await this.testCaseService.getCallTree(path);
      this.log('got testexec call tree answer from backend', callTreeNode);
      this.runningNumber = 0;
      const transformedCallTreeNode = this.transformTreeNode(callTreeNode);
      const executedTree = await this.testExecutionService.getCallTree(resourceURL);
      this.log('got executed tree node', executedTree);
      if (executedTree.testRuns) {
        if (updateExecutionStatus) {
          executedTree.testRuns[0].children.forEach(child => this.updateExecutionStatus(child));
        }
        this.treeNode = this.transformExecutionTree(executedTree, transformedCallTreeNode);
        this.treeNode.expanded = true;
        this.treeNode.children.forEach(child => this.updateExpansionStatus(child));
        this.messagingService.publish(TEST_EXECUTION_TREE_LOADED, {});
      }
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
      this.messagingService.publish(TEST_EXECUTION_TREE_LOADED, {});
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
      hover: 'not executed yet',
      id: serviceNode.treeId,
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
  private transformExecutionTree(executedCallTree: ExecutedCallTree, callTree: TreeNode): TreeNode {
    const result: TreeNode = {
      name: 'Testrun: ' + executedCallTree.started,
      expanded: true,
      root: null, // initialized later (see below)
      children: [], // initialized after root was set
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: '', // initialized later (see below)
      hover: `Test Suite [Run]: ${executedCallTree.testSuiteId}[${executedCallTree.testSuiteRunId}]`
    };
    if (executedCallTree.testRuns) {
      const rootID = new TestRunId(executedCallTree.testSuiteId, executedCallTree.testSuiteRunId, executedCallTree.testRuns[0].testRunId);
      result.root = result;
      result.id = rootID.toPathString();
      result.children = (executedCallTree.testRuns[0].children || [])
        .map(node => this.transformExecutionNode(node, callTree, rootID, result.root));
    }
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
          if (originalChildren) {
            const treeNodeId = node.id.split('/').pop();
            const childIndex = originalChildren.findIndex((origChild) => this.compareTreeIds(treeNodeId, origChild.id) === 0);
            if (originalChildren.length > childIndex && childIndex >= 0) {
              originalNode = originalChildren[index];
            }
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

  public compareTreeIds(idA: string, idB: string): Number {
    const pathA = idA.split('-');
    const pathB = idB.split('-');
    let index = 1;
    while (index < pathA.length && index < pathB.length) {
      const segmentA = parseInt(pathA[index], 10);
      const segmentB = parseInt(pathB[index], 10);
      if (segmentA !== segmentB) {
        return segmentA - segmentB;
      }
      index ++;
    }
    if (pathA.length < pathB.length) {
      return -1; // idA < idB
    } else if (pathA.length > pathB.length) {
      return 1; // idA > idB
    } else {
      return 0;
    }
  }

  private mergeChildTree(originalChildren: TreeNode[], childrenUpdate: TreeNode[]): TreeNode[] {
    if (originalChildren && originalChildren.length > childrenUpdate.length) {
      let originalChildIndex = 0;
      let executedChildIndex = 0;
      const newChildren = new Array();
      while (originalChildIndex < originalChildren.length || executedChildIndex < childrenUpdate.length) {
        if (originalChildIndex >= originalChildren.length) {
          newChildren.push(childrenUpdate[executedChildIndex]);
          executedChildIndex++;
        } else if (executedChildIndex >= childrenUpdate.length) {
          newChildren.push(originalChildren[originalChildIndex]);
          originalChildIndex++;
        } else {
          const completeExecutedIds = childrenUpdate[executedChildIndex].id.split('/');
          const comparedAtoB = this.compareTreeIds(originalChildren[originalChildIndex].id, completeExecutedIds.pop());
          if (comparedAtoB <= -1) {
            newChildren.push(originalChildren[originalChildIndex]);
            originalChildIndex++;
          } else if (comparedAtoB >= 1) {
            newChildren.push(childrenUpdate[executedChildIndex]);
            executedChildIndex++;
          } else {
            newChildren.push(childrenUpdate[executedChildIndex]);
            originalChildIndex++;
            executedChildIndex++;
          }
        }
      }
      return newChildren;
    }
    return childrenUpdate;
  }

  // TOOD: eventually move this into the commons (is a code duplication from web-testexec-details)!
  private formatNanoseconds(nanoseconds: number): string {
    const microseconds = Math.floor(nanoseconds / 1e3) % 1000;
    const milliseconds = Math.floor(nanoseconds / 1e6) % 1000;
    const seconds = Math.floor(nanoseconds / 1e9) % 60;
    const minutes = Math.floor(nanoseconds / 6e10) % 60;
    const hours = Math.floor(nanoseconds / 3.6e12) % 60;

    let humanReadableTime: string;
    if (nanoseconds < 1000) {
      humanReadableTime = nanoseconds.toString() + ' ns';
    } else if (nanoseconds < 1e6) {
      humanReadableTime = microseconds.toString() + ' µs';
    } else if (nanoseconds < 1e9) {
      humanReadableTime = milliseconds.toString() + ' ms';
    } else {
      humanReadableTime = `${seconds}.${milliseconds} s`;
      if (nanoseconds >= 6e10) {
        humanReadableTime = minutes + ' min ' + humanReadableTime;
        if (nanoseconds >= 3.6e12) {
          humanReadableTime = hours + ' h ' + humanReadableTime;
        }
      }
    }

    return humanReadableTime;
  }


  private hoverFor(executedCallTreeNode: ExecutedCallTreeNode): string {
    let result = executedCallTreeNode.status ? executedCallTreeNode.status + ':' : 'unknown:';

    if (executedCallTreeNode.enter && executedCallTreeNode.leave) {
      result = result + ' ran ' + this.formatNanoseconds(Number(executedCallTreeNode.leave) - Number(executedCallTreeNode.enter));
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
    return this.runCancelButtonClass !== this.executeIcon;
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

  loadTestRun(testRunItem: UITestRun) {
    this.log('loading ' + testRunItem.displayName);
    this.loadExecutedTreeFor(testRunItem.executingTclPaths[0], testRunItem.testSuitRunResourceUrl, true);
  }

}
