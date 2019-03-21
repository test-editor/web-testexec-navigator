import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MessagingModule } from '@testeditor/messaging-service';
import { AppComponent } from './app.component';
import { TestExecNavigatorModule } from './modules/navigator/test-exec-navigator.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    TestExecNavigatorModule.forRoot(
      { testCaseServiceUrl: 'http://localhost:8080' },
      { testExecutionServiceUrl: 'http://localhost:8080' }),
    MessagingModule.forRoot()
  ],
  providers: [ ],
  bootstrap: [AppComponent]
})
export class AppModule { }
