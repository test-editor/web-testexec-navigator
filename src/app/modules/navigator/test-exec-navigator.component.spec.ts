import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { TestExecNavigatorComponent, EMPTY_TREE, UITestRunStatus } from './test-exec-navigator.component';
import { TreeViewerModule, TreeNode } from '@testeditor/testeditor-commons';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { TestCaseService, CallTreeNode, DefaultTestCaseService } from '../test-case-service/default-test-case.service';
import { mock, instance, capture, anyString, when, resetCalls, verify } from 'ts-mockito';
import { ExecutedCallTree, TestExecutionService, DefaultTestExecutionService } from '../test-execution-service/test-execution.service';
import { TEST_NAVIGATION_SELECT } from '../event-types-out';
import { By } from '@angular/platform-browser';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestExecutionState } from '../test-execution-service/test-execution-state';
import { idPrefix } from '../module-constants';

describe('TestExecNavigatorComponent', () => {
  let component: TestExecNavigatorComponent;
  let messagingService: MessagingService;
  let fixture: ComponentFixture<TestExecNavigatorComponent>;
  const testCaseServiceMock = mock(DefaultTestCaseService);
  const testExecutionServiceMock = mock(DefaultTestExecutionService);

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

  it('should provide transformed call tree merged with static call tree from backend (in case of errors during test execution)',
     fakeAsync(async () => {
       // given
       const executedTree: ExecutedCallTree = {
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

       const expectedTree: CallTreeNode = {
         displayName: 'some',
         children: [
           { displayName: 'first',
             children: [] },
           { displayName: 'other',
             children: [] },
           { displayName: 'still another',
             children: [] }
         ]
       };

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
       expect(testCaseRoot.children[0].hover).toMatch('.*var = "val".*');
       expect(testCaseRoot.children[1].name).toMatch('real other');
       expect(testCaseRoot.children[1].expandedCssClasses).toMatch('.*tree-item-in-error.*');
       expect(testCaseRoot.children[1].hover).toMatch('[\\s\\S]*\\{"some key":\\[42,48\\],"otherKey":"Hello"\\}');
       expect(testCaseRoot.children[2].name).toMatch('still another');
       expect(testCaseRoot.children[2].expandedCssClasses).not.toMatch('.*tree-item.*', 'node not executed should not be marked');
       expect(testCaseRoot.expandedCssClasses).toMatch('.*tree-item-in-error.*');
  }));

  it('should provide transformed call tree when loading static call tree expectation from backend', fakeAsync(async () => {
    // given
    const node: CallTreeNode = {
      children: [{
        displayName: 'child',
        children: []
      }],
      displayName: 'root'
    };

    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(node));

    // when
    await component.updateTreeFor('test.tcl');

    // then
    expect(component.treeNode).toEqual({
      name: 'root',
      expanded: true,
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: 'ID0',
      hover: 'ID0:',
      root: component.treeNode,
      children: [
        {
          name: 'child',
          expanded: true,
          root: component.treeNode,
          children: [ ],
          collapsedCssClasses: 'fa-circle',
          expandedCssClasses: 'fa-circle',
          leafCssClasses: 'fa-circle',
          id: 'ID1',
          hover: 'ID1:'
        }
      ]
    });
  }));

  it('unselects previous selection, sets "selected" flag, and publishes TEST_NAVIGATION_SELECT event when element is clicked', () => {
    // given
    let actualPayload = null;
    messagingService.subscribe(TEST_NAVIGATION_SELECT, (payload) => actualPayload = payload);

    component.treeNode = { name: 'root', expanded: true, root: null, children: [
      { name: 'child1', root: null, children: [], id: '1234/5678/9/0' },
      { name: 'child2', root: null, children: [] }
    ] };
    component.selectedNode = component.treeNode.children[1];
    fixture.detectChanges();

    // when
    const items = fixture.debugElement.queryAll(By.css('.tree-view-item-key'));
    items[1].nativeElement.click(); // click 'child1'

    // then
    expect(component.treeNode.children[1].selected).toBeFalsy();
    expect(component.treeNode.children[0].selected).toBeTruthy();
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
    const testNode: TreeNode = {
      name: 'name',
      root: null,
      children: [],
      id: 'some/test.tcl'
    };
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(Promise.resolve({ displayName: 'displayName', children: [] }));

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
    const testNode: TreeNode = {
      name: 'name',
      root: null,
      children: [],
      id: 'some/test.tcl'
    };
    when(testCaseServiceMock.getCallTree(testNode.id)).thenReturn(Promise.resolve({ displayName: 'displayName', children: [] }));
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
    const testNode: TreeNode = {
      name: 'name',
      root: null,
      children: [],
      id: 'some/test.tcl'
    };
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
    expect(component.loadExecutedTreeFor).toHaveBeenCalledWith(tclPath, 'someUrl');
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
    const testRunDropdown = fixture.debugElement.queryAll(By.css('.testRunDropdown'))[0];
    // disable animation
    testRunDropdown.nativeElement.classList.add('no-animate');
    fixture.detectChanges();

    // then
    expect(window.getComputedStyle(testRunDropdown.nativeElement).opacity).toEqual('1');
  });
});
