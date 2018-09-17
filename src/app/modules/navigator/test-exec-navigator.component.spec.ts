import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { TestExecNavigatorComponent, EMPTY_TREE } from './test-exec-navigator.component';
import { TreeViewerModule, TreeNode } from '@testeditor/testeditor-commons';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { TestCaseService, CallTreeNode, DefaultTestCaseService } from '../test-case-service/default-test-case.service';
import { mock, instance, capture, anyString, when, resetCalls } from 'ts-mockito';
import { ExecutedCallTree, TestExecutionService, DefaultTestExecutionService } from '../test-execution-service/test-execution.service';
import { TEST_NAVIGATION_SELECT } from '../event-types-out';
import { By } from '@angular/platform-browser';
import { HttpProviderService } from '../http-provider-service/http-provider.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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
    // when
    fixture.detectChanges();

    // then
    const runButton = fixture.debugElement.queryAll(By.css('button[id=run]'))[0].nativeElement;
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
    const runButton = fixture.debugElement.queryAll(By.css('button[id=run]'))[0].nativeElement;
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
    const runButton = fixture.debugElement.queryAll(By.css('button[id=run]'))[0].nativeElement;
    runButton.click();
    fixture.detectChanges();
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
    fixture.detectChanges();
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn();

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();

    // then
    expect(testExecutionStarted).toBeTruthy();
  }));

  it('switches button to cancel if a test execution was started', fakeAsync(() => {
    // given
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve(null));

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();
    fixture.detectChanges();

    // then
    const cancelButton = fixture.debugElement.queryAll(By.css('button[id=run]'))[0];
    expect(cancelButton.properties.className).toContain('fa-stop-circle-o');
  }));

  it('switches button back to run if test execution failed to start', fakeAsync(() => {
    // given
    when(testExecutionServiceMock.execute('some/test.tcl')).thenThrow(new Error());

    // when
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();
    fixture.detectChanges();

    // then
    const cancelButton = fixture.debugElement.queryAll(By.css('button[id=run]'))[0];
    expect(cancelButton.properties.className).toContain('fa-play');
  }));

  it('blocks test selected events if executing a test', fakeAsync(() => {
    // given
    component.treeNode = EMPTY_TREE;
    // the following mock is nevery really used (which this test should proove),
    // but if it were used, it would change component.treeNode.name
    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve({ displayName: 'displayName', children: [] }));
    when(testExecutionServiceMock.execute('some/test.tcl')).thenReturn(Promise.resolve(null));
    messagingService.publish('test.execute.request', 'some/test.tcl');
    tick();
    fixture.detectChanges();

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
  }));

  it('switches button back to run if test execution finished', () => {
    // TODO: test to come as soon as test are polled and the end of a test run is actually detected
  });

});
