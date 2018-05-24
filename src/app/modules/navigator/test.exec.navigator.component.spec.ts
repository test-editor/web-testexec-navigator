import { async, ComponentFixture, TestBed, fakeAsync, inject, tick } from '@angular/core/testing';

import { TestExecNavigatorComponent } from './test.exec.navigator.component';
import { TreeViewerComponent } from '../tree-viewer/tree-viewer.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { TestCaseService, CallTreeNode, DefaultTestCaseService } from '../test-case-service/default.test.case.service';
import { mock, instance, when, anyFunction, capture } from 'ts-mockito';
import { TestExecutionService, DefaultTestExecutionService } from '../test-execution-service/test.execution.service';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { TestCaseServiceConfig } from '../test-case-service/test.case.service.config';
import { TestExecutionServiceConfig } from '../test-execution-service/test.execution.service.config';
import { HttpClientModule } from '@angular/common/http';
import { ExecutedCallTree } from '../test-execution-service/test.execution.service';

describe('TestExecNavigatorComponent', () => {
  let component: TestExecNavigatorComponent;
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
         CommitID: '',
         Source: '',
         Children: [{
             ID: 'IDROOT',
             Type: 'TEST',
             Enter: '1234',
             Message: 'some',
             Children: [
               {
                 ID: 'ID0',
                 Type: 'SPEC',
                 Enter: '2345',
                 Message: 'real first',
                 PreVariables: [
                   { Key: 'var', Value: 'val' }
                 ],
                 Leave: '2346',
                 Status: 'OK'
               },
               {
                 ID: 'ID1',
                 Type: 'SPEC',
                 Enter: '2346',
                 Message: 'real other'
               },
             ],
             Leave: '1235',
             Status: 'ERROR'
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
       component.loadExecutedTreeFor('test.tcl');

       // and when
       const [ , okFunction, ] = capture(testCaseServiceMock.getCallTree).last();
       okFunction.apply(null, [expectedTree]);

       // and when
       const [ , execTreeOkFunction, ] = capture(testExecutionServiceMock.getCallTree).last();
       execTreeOkFunction.apply(null, [executedTree]);

       // then
       expect(component.treeNode.name).toMatch('Testrun:.*');
       expect(component.treeNode.children.length).toEqual(1);
       const someNode = component.treeNode.children[0];
       expect(someNode.name).toMatch('some');
       expect(someNode.children.length).toEqual(3, 'both the actually executed nodes and the expected to be run node are expected');
       expect(someNode.children[0].name).toMatch('real first');
       expect(someNode.children[0].expandedCssClasses).toMatch('.*tree-item-ok.*');
       expect(someNode.children[0].hover).toMatch('.*var = "val".*');
       expect(someNode.children[1].name).toMatch('real other');
       expect(someNode.children[1].expandedCssClasses).toMatch('.*tree-item-in-error.*');
       expect(someNode.children[2].name).toMatch('still another');
       expect(someNode.children[2].expandedCssClasses).not.toMatch('.*tree-item.*', 'node not executed should not be marked');
       expect(someNode.expandedCssClasses).toMatch('.*tree-item-in-error.*');
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
          collapsedCssClasses: 'fa-chevron-right',
          expandedCssClasses: 'fa-chevron-down',
          leafCssClasses: 'fa-folder',
          id: 'ID1',
          hover: 'ID1:'
        }
      ]
    });
  }));

});
