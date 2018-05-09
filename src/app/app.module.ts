import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { NavigatorModule } from './modules/navigator/navigator.module';
import { MessagingService, MessagingModule } from '@testeditor/messaging-service';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    NavigatorModule.forRoot({ testCaseServiceUrl: 'http://localhost:8080' }),
    MessagingModule.forRoot()
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
