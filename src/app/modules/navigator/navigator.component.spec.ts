import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigatorComponent } from './navigator.component';
import { TreeViewerComponent } from '../tree-viewer/tree-viewer.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { TestCaseService } from '../test-case-service/default.test.case.service';
import { mock, instance } from 'ts-mockito';

describe('NavigatorComponent', () => {
  let component: NavigatorComponent;
  let fixture: ComponentFixture<NavigatorComponent>;
  const testCaseServiceMock = mock(TestCaseService);

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MessagingModule.forRoot()
      ],
      declarations: [
        NavigatorComponent,
        TreeViewerComponent
      ],
      providers: [
        { provide: TestCaseService, useValue: instance(testCaseServiceMock) }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
