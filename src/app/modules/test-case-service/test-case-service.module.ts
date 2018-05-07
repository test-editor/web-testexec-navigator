import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestCaseServiceConfig } from './test-case-service-config';
import { DefaultTestCaseService, TestCaseService, CallTree } from './default-test-case-service';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    DefaultTestCaseService, CallTree
  ],
  exports: [
    DefaultTestCaseService, CallTree
  ]
})
export class TestCaseServiceModule {
  static forRoot(testCaseServiceConfig: TestCaseServiceConfig): ModuleWithProviders {
    return {
      ngModule: TestCaseServiceModule,
      providers: [
        { provide: TestCaseServiceConfig, useValue: testCaseServiceConfig },
        { provide: TestCaseService, useClass: DefaultTestCaseService }
      ]
    };
  }
}
