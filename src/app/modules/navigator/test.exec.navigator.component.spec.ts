import { async, ComponentFixture, TestBed, fakeAsync, inject, tick } from '@angular/core/testing';

import { TestExecNavigatorComponent } from './test.exec.navigator.component';
import { TreeViewerComponent } from '../tree-viewer/tree-viewer.component';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { TestCaseService, CallTreeNode, DefaultTestCaseService } from '../test-case-service/default.test.case.service';
import { mock, instance, when, anyFunction, capture } from 'ts-mockito';
import { TestExecutionService, DefaultTestExecutionService } from '../test-execution-service/test.execution.service';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { TestCaseServiceConfig } from '../test-case-service/test.case.service.config';
import { TestExecutionServiceConfig } from '../test-execution-service/test.execution.service.config';
import { HttpClientModule } from '@angular/common/http';
import { ExecutedCallTree } from '../test-execution-service/test.execution.service';
import { TEST_NAVIGATION_SELECT } from './event-types';
import { By } from '@angular/platform-browser';

describe('TestExecNavigatorComponent', () => {
  let component: TestExecNavigatorComponent;
  let messagingService: MessagingService;
  let fixture: ComponentFixture<TestExecNavigatorComponent>;
  const testCaseServiceMock = mock(DefaultTestCaseService);
  const testExecutionServiceMock = mock(DefaultTestExecutionService);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MessagingModule.forRoot()
      ],
      declarations: [
        TestExecNavigatorComponent,
        TreeViewerComponent
      ],
      providers: [
        { provide: TestCaseService, useValue: instance(testCaseServiceMock) },
        { provide: TestExecutionService, useValue: instance(testExecutionServiceMock) }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestExecNavigatorComponent);
    messagingService = TestBed.get(MessagingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should provide transformed call tree merged with static call tree from backend (in case of errors during test execution)',
     fakeAsync(() => {
       // given
       const executedTree: ExecutedCallTree = {
         'commitId': '',
         'source': '',
         'children': [{
             'id': 'IDROOT',
             'type': 'TEST',
             'enter': '1234',
             'message': 'some',
             'children': [
               {
                 'id': 'ID0',
                 'type': 'SPEC',
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
                 'type': 'SPEC',
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

       // when
       component.loadExecutedTreeFor('test.tcl', 'http://example.org/test-suite/1234/5678');

       // and when
       const [ , okFunction, ] = capture(testCaseServiceMock.getCallTree).last();
       okFunction.apply(null, [expectedTree]);

       // and when
       const [ , execTreeOkFunction, ] = capture(testExecutionServiceMock.getCallTree).last();
       execTreeOkFunction.apply(null, [executedTree]);

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

  it('should provide transformed call tree when loading static call tree expectation from backend', fakeAsync(() => {
    // given
    const node: CallTreeNode = {
      children: [{
        displayName: 'child',
        children: []
      }],
      displayName: 'root'
    };

    // when
    component.updateTreeFor('test.tcl');

    // and when
    const [path, okFunc, errorFunc] = capture(testCaseServiceMock.getCallTree).last();
    okFunc.apply(null, [node]);

    // then
    expect(component.treeNode).toEqual({
      name: 'root',
      expanded: true,
      collapsedCssClasses: 'fa-chevron-right',
      expandedCssClasses: 'fa-chevron-down',
      leafCssClasses: 'fa-folder',
      id: 'ID0',
      hover: 'ID0:',
      children: [
        {
          name: 'child',
          expanded: true,
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

    component.treeNode = { name: 'root', expanded: true, children: [
      { name: 'child1', children: [] },
      { name: 'child2', children: [] }
    ] };
    component.selectedNode = component.treeNode.children[1];
    fixture.detectChanges();

    // when
    const items = fixture.debugElement.queryAll(By.css('.tree-view-item-key'));
    items[1].nativeElement.click(); // click 'child1'

    // then
    expect(component.treeNode.children[1].selected).toBeFalsy();
    expect(component.treeNode.children[0].selected).toBeTruthy();
    expect(actualPayload).toEqual(component.treeNode.children[0]);
  });

});
