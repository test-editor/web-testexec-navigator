import { Component, isDevMode, OnDestroy, OnInit, Output } from '@angular/core';
import { MessagingService } from '@testeditor/messaging-service';
import { CommonTreeNodeActions, TreeNode, TreeNodeWithoutParentLinks, TreeViewerKeyboardConfig,
  TREE_NODE_SELECTED } from '@testeditor/testeditor-commons';
import { Subscription } from 'rxjs';
import { TEST_CANCEL_REQUEST, TEST_EXECUTE_REQUEST, TEST_SELECTED } from '../event-types-in';
import { SNACKBAR_DISPLAY_NOTIFICATION, TestRunCompletedPayload, TEST_EXECUTION_FAILED, TEST_EXECUTION_FINISHED, TEST_EXECUTION_STARTED,
  TEST_EXECUTION_START_FAILED, TEST_EXECUTION_TREE_LOADED, TEST_NAVIGATION_SELECT } from '../event-types-out';
import { idPrefix } from '../module-constants';
import { CallTreeNode, TestCaseService } from '../test-case-service/default-test-case.service';
import { TestExecutionState } from '../test-execution-service/test-execution-state';
import { ExecutedCallTree, ExecutedCallTreeNode, TestExecutionService,
  TestSuiteExecutionStatus } from '../test-execution-service/test-execution.service';
import { TestRunId } from './test-run-id';

export const EMPTY_TREE = TreeNode.create({ name: '<empty>', children: [] });

export type UITestRunStatus = 'running' | 'successful' | 'failure';
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

  private executingTestResourceUrl: string = null;
  private treeNodeSelectedSubscription: Subscription;
  private testExecutionSubscription: Subscription;
  private testExecutionFailedSubscription: Subscription;
  private testCancelSubscription: Subscription;
  private testPathSelected: string = null;

  public runCancelButtonClass = this.executeIcon;
  public testRunList: UITestRun[] = [];

  @Output() treeNode: TreeNode = EMPTY_TREE;
  @Output() treeConfig: TreeViewerKeyboardConfig = {
    onDoubleClick: (node) => node.expanded !== undefined ? node.expanded = !node.expanded : {},
    onIconClick: (node) => node.expanded !== undefined ? node.expanded = !node.expanded : {},
    onKeyPress: this.treenodeAction.arrowKeyNavigation
  };

  testSelectedSubscription: Subscription;
  testRunCompletedSubscription: Subscription;
  testRunFailedSubscription: Subscription;
  runningNumber: number;

  constructor(private messagingService: MessagingService,
    private testCaseService: TestCaseService,
    private testExecutionService: TestExecutionService, private treenodeAction: CommonTreeNodeActions) {
  }

  ngOnInit() {
    this.setupTreeNodeSelectedListener();
    this.setupTestExecutionFinishedListener();
    this.setupTestSelectedListener();
    this.setupTestExecutionListener();
  }

  ngOnDestroy() {
    this.treeNodeSelectedSubscription.unsubscribe();
    this.testSelectedSubscription.unsubscribe();
    this.testRunCompletedSubscription.unsubscribe();
    this.testExecutionSubscription.unsubscribe();
    this.testCancelSubscription.unsubscribe();
    this.testExecutionFailedSubscription.unsubscribe();
    this.testRunFailedSubscription.unsubscribe();
  }

  setupTreeNodeSelectedListener() {
    this.treeNodeSelectedSubscription = this.messagingService.subscribe(TREE_NODE_SELECTED, (node: TreeNode) => {
      if (node.root === this.treeNode.root) {
        this.messagingService.publish(TEST_NAVIGATION_SELECT, node.id);
        this.log('sending TEST_NAVIGATION_SELECT for executed node', node.id);
      }
    });
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

  async handleCancelRequest(): Promise<void> {
    if (this.executingTestResourceUrl) {
      try {
        await this.testExecutionService.terminate(this.executingTestResourceUrl);
      } catch (error) {
        this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION, {
          message: (error as Error).message,
          timeout: 5000
        });
      }
    } else {
      this.messagingService.publish(SNACKBAR_DISPLAY_NOTIFICATION,
        { message: 'Cannot cancel test execution: no tests seem to be running.', timeout: 5000 });
    }
  }

  buildUITestRunFromSingleTest(tclPath: string, executingTestResourceUrl: string, date: Date): UITestRun {
    const shortenedTestPath = (tclPath.startsWith('src/test/java/') && (tclPath.endsWith('.tcl'))) ?
      tclPath.substring(14, tclPath.length - 4) : tclPath;
    const paths = shortenedTestPath.split('/');
    const testNameOnly = paths.pop();
    const name = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      + ' ' + testNameOnly + ' (' + paths.join('.') + ')';
    return { displayName: name, testSuitRunResourceUrl: executingTestResourceUrl, executingTclPaths: [tclPath], cssClass: 'running' };
  }

  addTestRun(testRun: UITestRun) {
    this.testRunList.unshift(testRun);
  }

  async handleExecutionRequest(tclPath: string) {
    try {
      this.switchToTestCurrentlyRunningStatus();
      this.executingTestResourceUrl = await this.testExecutionService.execute(tclPath);
      const payload = {
        path: tclPath,
        response: this.executingTestResourceUrl,
        message: 'Execution of "\${}" has been started.'
      };
      this.messagingService.publish(TEST_EXECUTION_STARTED, payload);
      this.log('sending TEST_EXECUTION_STARTED', payload);
      const testRunItem = this.buildUITestRunFromSingleTest(tclPath, this.executingTestResourceUrl, new Date());
      this.addTestRun(testRunItem);
      const finalExecutionStatus = await this.testExecutionWatcher(this.executingTestResourceUrl, tclPath);
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
    this.executingTestResourceUrl = null;
    this.setupTestSelectedListener();
  }

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

          executedTree.testRuns
          // cannot get flatMap / flat functions to compile with ng-packagr, so replaced it with map+reduce
          // .flatMap((testRun) => testRun.children)
            .map((testRun) => testRun.children)
            .reduce((acc, val) => acc.concat(val), [])
            .forEach(child => this.updateExecutionStatus(child));
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

  private transformTreeNode(serviceNode: CallTreeNode, parent?: TreeNode): TreeNode {
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
    const result = TreeNode.create({
      name: serviceNode.displayName,
      expanded: true,
      children: [], // initialized after root was set
      collapsedCssClasses: collapsedCssClass,
      expandedCssClasses: expandedCssClass,
      leafCssClasses: leafCssClass,
      hover: 'not executed yet',
      id: serviceNode.treeId,
    }, parent);

    result.children = serviceNode.children.map(node => this.transformTreeNode(node, result));
    return result;
  }

  private transformExecutionTree(executedCallTree: ExecutedCallTree, callTree: TreeNode): TreeNode {
    const name = 'Testrun: ' + executedCallTree.started;
    const hover = `Test Suite [Run]: ${executedCallTree.testSuiteId}[${executedCallTree.testSuiteRunId}]`;

    let rootID: TestRunId;
    let children: (id: TestRunId) => TreeNodeWithoutParentLinks[] = () => [];
    if (executedCallTree.testRuns) {
      if (executedCallTree.testRuns.length === 1) {
        rootID = new TestRunId(executedCallTree.testSuiteId, executedCallTree.testSuiteRunId, executedCallTree.testRuns[0].testRunId);
        children = (id) => (executedCallTree.testRuns[0].children || []).map(node => this.transformExecutionNode(node, callTree, id));

      } else if (executedCallTree.testRuns.length > 1) {
        rootID = new TestRunId(executedCallTree.testSuiteId, executedCallTree.testSuiteRunId);
        children = () => executedCallTree.testRuns
          .map((testrun) => (testrun.children || [])
          .map(node => this.transformExecutionNode(node, callTree,
            new TestRunId(rootID.testSuiteID, rootID.testSuiteRunID, testrun.testRunId)))
        ).reduce((acc, val) => acc.concat(val), []);
      }
    }
    return TreeNode.create(this.testExecTreeNode(name, hover, rootID, children));
  }

  private testExecTreeNode(name: string, hover: string, rootID: TestRunId, children: (rootID: TestRunId) => TreeNodeWithoutParentLinks[]):
    TreeNodeWithoutParentLinks {
    return {
      name: name,
      expanded: true,
      children: children(rootID),
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: rootID ? rootID.toPathString() : '',
      hover: hover
    };
  }

  private transformExecutionNode(executedCallTreeNode: ExecutedCallTreeNode,
    original: TreeNodeWithoutParentLinks, baseID: TestRunId): TreeNodeWithoutParentLinks {
    let originalChildren: TreeNodeWithoutParentLinks[];

    if (original) {
      originalChildren = original.children;
    }

    const statusClass = this.statusClass(executedCallTreeNode);
    let statusClassString = '';
    if (statusClass) {
      statusClassString = ' ' + statusClass;
    }

    const id = new TestRunId(baseID.testSuiteID, baseID.testSuiteRunID, baseID.testRunID, executedCallTreeNode.id);

    const result: TreeNodeWithoutParentLinks = {
      name: executedCallTreeNode.message,
      expanded: true,
      children: [],
      collapsedCssClasses: this.collapsedIcon(executedCallTreeNode) + statusClassString,
      expandedCssClasses: this.expandedIcon(executedCallTreeNode) + statusClassString,
      leafCssClasses: 'fa-folder',
      id: id.toPathString(),
      hover: this.hoverFor(executedCallTreeNode)
    };
    result.children = this.mergeChildTree(originalChildren, (executedCallTreeNode.children || []).map(
      (node, index) => {
        let originalNode: TreeNodeWithoutParentLinks;
        if (originalChildren) {
          const treeNodeId = node.id.split('/').pop();
          const childIndex = originalChildren.findIndex((origChild) => this.compareTreeIds(treeNodeId, origChild.id) === 0);
          if (originalChildren.length > childIndex && childIndex >= 0) {
            originalNode = originalChildren[index];
          }
        }
        return this.transformExecutionNode(node, originalNode, id);
      }));

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
      index++;
    }
    if (pathA.length < pathB.length) {
      return -1; // idA < idB
    } else if (pathA.length > pathB.length) {
      return 1; // idA > idB
    } else {
      return 0;
    }
  }

  private mergeChildTree(originalChildren: TreeNodeWithoutParentLinks[], childrenUpdate: TreeNodeWithoutParentLinks[]):
    TreeNodeWithoutParentLinks[] {
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
