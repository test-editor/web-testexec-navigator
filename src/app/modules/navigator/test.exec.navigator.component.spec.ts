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

  it('should provide expected call tree when loading from backend', fakeAsync(() => {
    // given
    component.updateTreeFor('test.tcl');
    const node: CallTreeNode = {
      children: [{
        displayName: 'child',
        children: []
      }],
      displayName: 'root'
    };
    tick();
    const [path, okFunc, errorFunc] = capture(testCaseServiceMock.getCallTree).last();
    okFunc.apply(null, [node]);
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
