import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NavigatorComponent } from './modules/navigator/navigator.component';
import { TreeViewerComponent } from './modules/tree-viewer/tree-viewer.component';
import { NavigatorModule } from '../../public_api';
import { MessagingModule } from '@testeditor/messaging-service';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NavigatorModule.forRoot({ testCaseServiceUrl: 'http://localhost:8080' }),
        MessagingModule.forRoot()
      ],
      declarations: [
        AppComponent,
      ],
    }).compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));

  it('should render a simple tree', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('div').textContent).toContain('<empty>');
  }));

});
