import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService, TreeNode, TreeViewerModule } from '@testeditor/testeditor-commons';
import { anyString, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { SnackbarMessage, SNACKBAR_DISPLAY_NOTIFICATION, TEST_NAVIGATION_SELECT, TEST_EXECUTION_TREE_LOADED } from '../event-types-out';
import { idPrefix } from '../module-constants';
import { CallTreeNode, DefaultTestCaseService, TestCaseService } from '../test-case-service/default-test-case.service';
import { TestExecutionState } from '../test-execution-service/test-execution-state';
import { DefaultTestExecutionService, ExecutedCallTree, TestExecutionService, TestSuiteExecutionStatus } from '../test-execution-service/test-execution.service';
import { EMPTY_TREE, TestExecNavigatorComponent } from './test-exec-navigator.component';
import { TEST_SELECTED, TEST_EXECUTE_REQUEST } from '../event-types-in';


describe('TestExecNavigatorComponent', () => {
  let component: TestExecNavigatorComponent;
  let messagingService: MessagingService;
  let fixture: ComponentFixture<TestExecNavigatorComponent>;
  const testCaseServiceMock = mock(DefaultTestCaseService);
  const testExecutionServiceMock = mock(DefaultTestExecutionService);

  function executedTreeSample(): ExecutedCallTree {
    return {
      'testSuiteId': '0',
      'testSuiteRunId': '0',
      'resourcePaths': [],
      'testRuns': [{
         'source': 'org/testeditor/Minimal',
         'testRunId': '1',
         'commitId': '',
         'started': '2018-06-14T12:52:48.327Z',
         'children': [{
           'id': 'IDROOT',
           'node': 'TEST',
           'enter': '1234',
           'message': 'some',
           'children': [
            {
              'id': 'ID0',
              'node': 'SPEC',
              'enter': '2345',
              'message': 'real first',
              'preVariables': {
                'var': 'val'
              },
              'leave': '2346',
              'status': 'OK'
            },
            {
              'id': 'ID1',
              'node': 'SPEC',
              'enter': '2346',
              'message': 'real other',
              'assertionError': 'some error message',
              'exception': 'some exception message',
              'fixtureException': {
                'some key': [ 42, 48 ],
                'otherKey': 'Hello'
              }
            },
          ],
        'leave': '1235',
        'status': 'ERROR'
      }]
     }]
    };
  }

  function expectedTreeSample(): CallTreeNode {
    return {
      displayName: 'some',
      treeId: 'ID',
      children: [
        { displayName: 'first',
          treeId: 'IDROOT',
          children: [] },
        { displayName: 'other',
          treeId: 'ID0',
          children: [] },
        { displayName: 'still another',
          treeId: 'ID1',
          children: [] }
      ]
    };
  }

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule,
        MessagingModule.forRoot(),
        TreeViewerModule
      ],
      declarations: [
        TestExecNavigatorComponent
      ],
      providers: [
        HttpProviderService,
        HttpClient,
        { provide: TestCaseService, useValue: instance(testCaseServiceMock) },
        { provide: TestExecutionService, useValue: instance(testExecutionServiceMock) }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestExecNavigatorComponent);
    messagingService = TestBed.get(MessagingService);
    resetCalls(testExecutionServiceMock);
    resetCalls(testCaseServiceMock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  [['ID-0', 'ID-1', -1],
   ['ID-1', 'ID-0', 1],
   ['ID-1', 'ID-1', 0],
   ['ID-0-1', 'ID-0-1-0', -1],
   ['ID-0-1', 'ID-0-0-1', 1],
   ['ID-1-2-3', 'ID-1-2-2', 1],
   ['ID-0-1', 'ID-0-1', 0],
   ['ID-1-2-3', 'ID-1-2-3', 0],
   ['ID-1-2-3', 'ID-1-2-4', -1]
  ].forEach((idPair) => {

    it('compares tree ids correctly: ' + idPair, () => {
      const compared = component.compareTreeIds(idPair[0] as string, idPair[1] as string);

      expect(Math.sign(compared as number)).toEqual(idPair[2] as number, idPair[0] as string + ' compared to ' + idPair[1] as string);
    });
  });

  // TODO  Double check test assumptions
  it('should provide transformed call tree merged with static call tree from backend (in case of errors during test execution)',
     fakeAsync(async () => {
       // given
       const executedTree = executedTreeSample();
       const expectedTree = expectedTreeSample();

       when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(expectedTree));
       when(testExecutionServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(executedTree));

       // when
       await component.loadExecutedTreeFor('test.tcl', 'http://example.org/test-suite/1234/5678');

       // then
       expect(component.treeNode.name).toMatch('Testrun:.*');
       expect(component.treeNode.children.length).toEqual(1);
       const testCaseRoot = component.treeNode.children[0];
       expect(testCaseRoot.name).toMatch('some');
       expect(testCaseRoot.children.length).toEqual(3, 'both the actually executed nodes and the expected to be run node are expected');
       expect(testCaseRoot.children[0].name).toMatch('real first');
       expect(testCaseRoot.children[0].expandedCssClasses).toMatch('.*tree-item-ok.*');
       expect(testCaseRoot.children[0].hover).toMatch('OK: ran .* ns');
       expect(testCaseRoot.children[1].name).toMatch('real other');
       expect(testCaseRoot.children[1].expandedCssClasses).toMatch('fa-circle');
       expect(testCaseRoot.children[1].hover).toMatch('unknown:');
       expect(testCaseRoot.children[2].name).toMatch('still another');
       expect(testCaseRoot.children[2].expandedCssClasses).not.toMatch('.*tree-item.*', 'node not executed should not be marked');
       expect(testCaseRoot.expandedCssClasses).toMatch('.*tree-item-in-error.*');
  }));

  it('should provide transformed call tree when loading static call tree expectation from backend', fakeAsync(async () => {
    // given
    const node: CallTreeNode = {
      children: [{
        displayName: 'child',
        treeId: 'ID1',
        children: []
      }],
      displayName: 'root',
      treeId: 'ID0'
    };

    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(node));

    // when
    await component.updateTreeFor('test.tcl');

    // then
    expect(component.treeNode).toEqual(TreeNode.create({
      name: 'root',
      expanded: true,
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: 'ID0',
      hover: 'not executed yet',
      children: [
        {
          name: 'child',
          expanded: true,
          children: [ ],
          collapsedCssClasses: 'fa-circle',
          expandedCssClasses: 'fa-circle',
          leafCssClasses: 'fa-circle',
          id: 'ID1',
          hover: 'not executed yet'
        }
      ]
    }));
  }));

  it('unselects previous selection, sets "selected" flag, and publishes TEST_NAVIGATION_SELECT event when element is clicked', () => {
    // given
    let actualPayload = null;
    messagingService.subscribe(TEST_NAVIGATION_SELECT, (payload) => actualPayload = payload);

    component.treeNode = TreeNode.create({ name: 'root', expanded: true, children: [
      { name: 'child1',  children: [], id: '1234/5678/9/0' },
      { name: 'child2',  children: [] }
    ] });
    fixture.detectChanges();
    component.treeNode.children[1].selectOnly();


    // when
    const items = fixture.debugElement.queryAll(By.css('.tree-view-item-key'));
    items[1].nativeElement.click(); // click 'child1'

    // then
    expect(component.treeNode.children[1].selected).toBeFalsy('previous node remained selected');
    expect(component.treeNode.children[0].selected).toBeTruthy('new node was not selected');
    expect(actualPayload).toEqual('1234/5678/9/0');
  });

  it('ensures that test run button is deactivated on startup', () => {
    // given + when

    // then
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    console.log(runButton);
    expect(runButton.disabled).toBeTruthy();
  });

  it('activates execute button as soon as a test is available', fakeAsync(() => {
    // given
    component.treeNode = EMPTY_TREE;
    const testNode = TreeNode.create({
      name: 'name',
      children: [],
      id: 'some/test.tcl'
    });
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));

    // when
    messagingService.publish('test.selected', testNode);
    tick();
    fixture.detectChanges();

    // then
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    expect(runButton.disabled).toBeFalsy();
    expect(component.treeNode.name).toBe('displayName');
  }));

  it('sends an execution request when the execute button is pressed (and no test is running)', fakeAsync(() => {
    // given
    let testExecutionRequested = false;
    messagingService.subscribe('test.execute.request', () => {
      testExecutionRequested = true;
    });
    const testNode = TreeNode.create ({
      name: 'name',
      children: [],
      id: 'some/test.tcl'
    });
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    messagingService.publish('test.selected', testNode);
    tick();
    fixture.detectChanges();

    // when
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    runButton.click();
    tick();

    // then
    expect(testExecutionRequested).toBeTruthy();
  }));

  it('executes a test if the request is received', fakeAsync(() => {
    // given
    let testExecutionStarted = false;
    messagingService.subscribe('test.execution.started', () => {
      testExecutionStarted = true;
    });
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve(null));

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();

    // then
    expect(testExecutionStarted).toBeTruthy();
  }));

  it('switches button to cancel if a test execution was started', fakeAsync(() => {
    // given
    spyOn(component, 'switchToTestCurrentlyRunningStatus');
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve('someURL'));
    when(testExecutionServiceMock.getStatus(anyString())).thenReturn(
      Promise. resolve({ resourceURL: 'some', status: TestExecutionState.Running }),
      Promise. resolve({ resourceURL: 'some', status: TestExecutionState.LastRunSuccessful })
    );

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();

    // then
    expect(component.switchToTestCurrentlyRunningStatus).toHaveBeenCalled();
  }));

  it('keeps button enabled for cancelling if a test execution was started', fakeAsync(() => {
    // given
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    const testNode = TreeNode.create ({ name: 'name', children: [], id: 'some/test.tcl' });
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    messagingService.publish('test.selected', testNode);
    tick();
    fixture.detectChanges();

    // when
    runButton.click();
    tick();

    // then
    expect(runButton.disabled).toBeFalsy();
  }));

  it('sends "test.cancel.request" via message bus if the button is clicked while a test is running', fakeAsync(() => {
    // given
    let testCancellationRequested = false;
    messagingService.subscribe('test.cancel.request', () => {
      testCancellationRequested = true;
    });
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    const testNode = TreeNode.create ({ name: 'name', children: [], id: 'some/test.tcl' });
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve('someURL'));
    when(testExecutionServiceMock.getStatus(anyString())).thenReturn(
      Promise.resolve({ resourceURL: 'some', status: TestExecutionState.Running }),
      new Promise((resolve) => setTimeout(() => resolve({ resourceURL: 'some', status: TestExecutionState.LastRunSuccessful }), 1))
    );
    messagingService.publish('test.selected', testNode);
    tick(); fixture.detectChanges();
    runButton.click(); tick(); expect(component.testIsRunning()).toBeTruthy('precondition not met: test must be running');

    // when
    runButton.click(); tick();

    // then
    expect(testCancellationRequested).toBeTruthy();
    flush();
  }));

  it('sends request to cancel test execution to the backend when cancel button is clicked', fakeAsync(() => {
    // given
    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    const testNode = TreeNode.create ({ name: 'name', children: [], id: 'some/test.tcl' });
    const executionUrl = 'http://example.org/0/0';
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve(executionUrl));
    when(testExecutionServiceMock.getStatus(anyString())).thenReturn(
      Promise.resolve({ resourceURL: executionUrl, status: TestExecutionState.Running }),
      new Promise((resolve) => setTimeout(() => resolve({ resourceURL: 'some', status: TestExecutionState.LastRunSuccessful }), 1))
    );
    when(testExecutionServiceMock.terminate(anyString())).thenResolve();
    messagingService.publish('test.selected', testNode);
    tick(); fixture.detectChanges();
    runButton.click(); tick(); expect(component.testIsRunning()).toBeTruthy('precondition not met: test must be running');

    // when
    runButton.click(); tick();

    // then
    verify(testExecutionServiceMock.terminate(executionUrl)).once();
    flush();
  }));

  it('publishes a snack bar notification via the message bus when a test could not be terminated', fakeAsync(async () => {
    // given
    const expectedMessage = 'test could not be terminated!'; let actualMessage: string = null;
    const expectedTimeout = 5000; let actualTimeout: number = null;
    messagingService.subscribe(SNACKBAR_DISPLAY_NOTIFICATION, (payload: SnackbarMessage) => {
      actualMessage = payload.message;
      actualTimeout = payload.timeout;
    });

    when(testExecutionServiceMock.terminate(anyString())).thenReject(new Error(expectedMessage));

    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    const testNode = TreeNode.create ({ name: 'name', children: [], id: 'some/test.tcl' });
    const executionUrl = 'http://example.org/0/0';
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve(executionUrl));
    when(testExecutionServiceMock.getStatus(anyString())).thenReturn(
      Promise.resolve({ resourceURL: executionUrl, status: TestExecutionState.Running }),
      new Promise((resolve) => setTimeout(() => resolve({ resourceURL: 'some', status: TestExecutionState.LastRunSuccessful }), 1))
    );
    messagingService.publish('test.selected', testNode);
    tick(); fixture.detectChanges();
    runButton.click(); tick(); expect(component.testIsRunning()).toBeTruthy('precondition not met: test must be running');

    // when
    await component.handleCancelRequest();

    // then
    expect(actualMessage).toEqual(expectedMessage);
    expect(actualTimeout).toEqual(expectedTimeout);
    flush();
  }));

  it('publishes a snack bar notification when trying to terminate a test that has not yet properly started', fakeAsync(() => {
    // given
    const expectedMessage = 'Cannot cancel test execution: no tests seem to be running.'; let actualMessage: string = null;
    const expectedTimeout = 5000; let actualTimeout: number = null;

    messagingService.subscribe(SNACKBAR_DISPLAY_NOTIFICATION, (payload: SnackbarMessage) => {
      actualMessage = payload.message;
      actualTimeout = payload.timeout;
    });

    const runButton = fixture.debugElement.queryAll(By.css('button[id=' + idPrefix + 'icon-run]'))[0].nativeElement;
    const testNode = TreeNode.create ({ name: 'name', children: [], id: 'some/test.tcl' });
    const executionUrl = 'http://example.org/0/0';
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(
      Promise.resolve({ displayName: 'displayName', treeId: 'ID', children: [] }));
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(
      new Promise((resolve) => setTimeout(() => resolve(executionUrl), 1))
    );
    messagingService.publish('test.selected', testNode);
    tick(); fixture.detectChanges();
    runButton.click(); tick();

    // when
    runButton.click(); tick();

    // then
    expect(actualMessage).toEqual(expectedMessage);
    expect(actualTimeout).toEqual(expectedTimeout);
    verify(testExecutionServiceMock.terminate(executionUrl)).never();
    flush();
  }));

  it('switches button back to run if test execution failed to start', fakeAsync(() => {
    // given
    spyOn(component, 'switchToIdleStatus');
    when(testExecutionServiceMock.execute('some/test.tcl')).thenThrow(new Error());

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();
    fixture.detectChanges();

    // then
    expect(component.switchToIdleStatus).toHaveBeenCalled();
  }));

  it('blocks test selected events if executing a test', fakeAsync(() => {
    // given
    component.treeNode = EMPTY_TREE;
    component.switchToTestCurrentlyRunningStatus();

    // when
    const testNode = TreeNode.create ({
      name: 'name',
      children: [],
      id: 'some/test.tcl'
    });
    messagingService.publish('test.selected', testNode);
    tick();

    // then
    expect(component.treeNode.name).toBe('<empty>');
    verify(testCaseServiceMock.getCallTree(anyString())).never();
  }));

  it('switches button back to run if test execution finished', () => {
    // TODO: test to come as soon as test are polled and the end of a test run is actually detected
  });

  it('constructs a (readable) entry for test executions', () => {
    // given
    const tclPath = 'src/test/java/some/Test.tcl';

    // when
    const testRun = component.buildUITestRunFromSingleTest(tclPath, 'someUrl', new Date('1971-01-28 15:30'));

    // then
    expect(testRun.displayName).toEqual('15:30 Test (some)');
    expect(testRun.executingTclPaths).toEqual([tclPath]);
    expect(testRun.testSuitRunResourceUrl).toEqual('someUrl');
    expect(testRun.cssClass).toEqual('running');
    // jasmine.objectContaining does not work here, since testRun.class is of type UITestRunStatus
    // (which essentially is of type string, but type conformance calculation seems to fail here)
  });

  it('shows no test run button if no test runs are available', () => {
    // given + when +then
    const testRunButtons = fixture.debugElement.queryAll(By.css('.testRunButton'));

    expect(testRunButtons).toEqual([]);
  });

  it('shows the test run button if test runs are available', () => {
    // given
    const tclPath = 'src/test/java/some/Test.tcl';

    // when
    const testRun = component.buildUITestRunFromSingleTest(tclPath, 'someUrl', new Date('1971-01-28 15:30'));
    component.addTestRun(testRun);
    fixture.detectChanges();

    // then
    const testRunButton = fixture.debugElement.queryAll(By.css('.testRunButton'))[0].nativeElement;
    expect(testRunButton.disabled).toBeFalsy();
  });

  it('make sure the added test is added to the ui dropdown', () => {
    // given
    const tclPath = 'src/test/java/some/Test.tcl';

    // when
    const testRun = component.buildUITestRunFromSingleTest(tclPath, 'someUrl', new Date('1971-01-28 15:30'));
    component.addTestRun(testRun);
    fixture.detectChanges();

    // then
    const testRunDropdownElement = fixture.debugElement.queryAll(By.css('.testRunDropdown li:first-child'))[0].nativeElement;
    const spanWithRightCSSClass = fixture.debugElement.queryAll(By.css('.testRunDropdown .running'))[0];
    expect(testRunDropdownElement.innerHTML).toContain('15:30 Test (some)');
    expect(spanWithRightCSSClass).toBeDefined();
  });

  it('loads a test if selecting it from the test run dropdown', () => {
    // given
    const tclPath = 'src/test/java/some/Test.tcl';
    spyOn(component, 'loadExecutedTreeFor');
    when(testExecutionServiceMock.getCallTree('someUrl')).thenResolve({
      testSuiteId: '0',
      testSuiteRunId: '0',
      resourcePaths: [ tclPath ],
      testRuns: []
    });

    // when
    const testRun = component.buildUITestRunFromSingleTest(tclPath, 'someUrl', new Date('1971-01-28 15:30'));
    component.addTestRun(testRun);
    fixture.detectChanges();
    const testRunDropdownElement = fixture.debugElement.queryAll(By.css('.testRunDropdown li:first-child'));
    testRunDropdownElement[0].nativeElement.click();
    fixture.detectChanges();

    // then
    expect(component.loadExecutedTreeFor).toHaveBeenCalledWith(tclPath, 'someUrl', true);
  });

  // this test runs for chrome only
  xit('shows the dropdown if the test run button was clicked', () => {
    // given
    const tclPath = 'src/test/java/some/Test.tcl';
    when(testExecutionServiceMock.getCallTree('someUrl')).thenResolve({
      testSuiteId: '0',
      testSuiteRunId: '0',
      resourcePaths: [ tclPath ],
      testRuns: []
    });

    // when
    const testRun = component.buildUITestRunFromSingleTest(tclPath, 'someUrl', new Date('1971-01-28 15:30'));
    component.addTestRun(testRun);
    fixture.detectChanges();
    const testRunButton = fixture.debugElement.queryAll(By.css('.testRunButton'))[0].nativeElement;
    testRunButton.focus();
    testRunButton.click();
    fixture.detectChanges();
    const testRunDropdown = fixture.debugElement.queryAll(By.css('.testRunDropdown'))[0].nativeElement;
    // disable animation
    testRunDropdown.classList.add('no-animate');
    fixture.detectChanges();

    // then
    expect(window.getComputedStyle(testRunDropdown).opacity).toEqual('1');
  });

  it('sends the TEST_EXECUTION_TREE_LOADED event when a tree was loaded after TEST_SELECTED is received', fakeAsync(() => {
    // given
    const testFile = 'src/test/java/some/Test.tcl';
    let eventReceived = false;
    const subscription = messagingService.subscribe(TEST_EXECUTION_TREE_LOADED, () => {
      console.log('event received!');
      eventReceived = true;
    });

    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(expectedTreeSample()));
    when(testExecutionServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(executedTreeSample()));

    // when
    console.log('publishing event...');
    messagingService.publish(TEST_SELECTED,  { id: testFile });
    console.log('event published.');
    flush();
    console.log('fake async queue flushed.');

    // then
    expect(eventReceived).toBeTruthy();
    subscription.unsubscribe();
  }));

  it('does not send the TEST_EXECUTION_TREE_LOADED event when the status of a running test is updated', fakeAsync(() => {
    // given
    const testFile = 'src/test/java/some/Test.tcl';
    let eventReceived = false;
    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(expectedTreeSample()));
    when(testExecutionServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(executedTreeSample()));
    messagingService.publish(TEST_SELECTED, { id: testFile });
    tick();

    when(testExecutionServiceMock.execute(anyString())).thenResolve('someUrl');
    when(testExecutionServiceMock.getStatus(anyString()))
      .thenResolve({resourceURL: '', status: TestExecutionState.Running})
      .thenResolve({resourceURL: '', status: TestExecutionState.LastRunSuccessful});
    const subscription = messagingService.subscribe(TEST_EXECUTION_TREE_LOADED, () => eventReceived = true);

    // when
    messagingService.publish(TEST_EXECUTE_REQUEST, testFile);
    tick();

    // then
    expect(eventReceived).toBeFalsy();
    subscription.unsubscribe();
  }));
});
