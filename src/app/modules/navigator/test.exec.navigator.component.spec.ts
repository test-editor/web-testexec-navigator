import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestExecNavigatorComponent } from './test.exec.navigator.component';
import { TreeViewerComponent } from '../tree-viewer/tree-viewer.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { TestCaseService } from '../test-case-service/default.test.case.service';
import { mock, instance } from 'ts-mockito';
import { TestExecutionService } from '../test-execution-service/test.execution.service';

describe('TestExecNavigatorComponent', () => {
  let component: TestExecNavigatorComponent;
  let fixture: ComponentFixture<TestExecNavigatorComponent>;
  const testCaseServiceMock = mock(TestCaseService);
  const testExecutionServiceMock = mock(TestExecutionService);

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
});
