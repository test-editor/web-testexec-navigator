import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { MessagingModule } from '@testeditor/messaging-service';
import { TestExecNavigatorModule } from './modules/navigator/test-exec-navigator.module';
import { HttpProviderService } from './modules/http-provider-service/http-provider.service';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        TestExecNavigatorModule.forRoot({ testCaseServiceUrl: 'http://localhost:8080' },
                                        { testExecutionServiceUrl: 'http://localhost:8080' }),
        MessagingModule.forRoot()
      ],
      providers: [ HttpProviderService ],
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

  it('should render <empty> without children', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('div').textContent).toContain('<empty>');
  }));

});
