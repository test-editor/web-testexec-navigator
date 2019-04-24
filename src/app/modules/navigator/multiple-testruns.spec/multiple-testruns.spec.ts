import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService, TreeViewerModule } from '@testeditor/testeditor-commons';
import { anyString, instance, mock, resetCalls, when } from 'ts-mockito';
import { DefaultTestCaseService, TestCaseService } from '../../test-case-service/default-test-case.service';
import { DefaultTestExecutionService, TestExecutionService } from '../../test-execution-service/test-execution.service';
import { TestExecNavigatorComponent } from '../test-exec-navigator.component';
import { expectedResult } from './result-call-tree';

describe('TestExecNavigatorComponent handling multiple test runs', () => {
  let component: TestExecNavigatorComponent;
  let messagingService: MessagingService;
  let fixture: ComponentFixture<TestExecNavigatorComponent>;
  const testCaseServiceMock = mock(DefaultTestCaseService);
  const testExecutionServiceMock = mock(DefaultTestExecutionService);
  const callTree = require('./call-tree.json');
  const executedCallTree = require('./executed-call-tree.json');

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


  it('should result in one subtree per test run', async () => {
    // given
    when(testCaseServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(callTree));
    when(testExecutionServiceMock.getCallTree(anyString())).thenReturn(Promise.resolve(executedCallTree));

    // when
    await component.loadExecutedTreeFor('test.tcl', 'http://example.org/test-suite/0/0');

    // then
    console.log('Expected: ', expectedResult);
    console.log('Actual: ', component.treeNode);
    expect(component.treeNode).toEqual(expectedResult);
  });

});
