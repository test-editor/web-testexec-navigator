import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { TestExecNavigatorModule } from './modules/navigator/test-exec-navigator.module';
import { MessagingService, MessagingModule } from '@testeditor/messaging-service';
import { HttpProviderService } from './modules/http-provider-service/http-provider.service';


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
