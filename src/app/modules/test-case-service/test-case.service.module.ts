import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestCaseServiceConfig } from './test-case.service.config';
import { DefaultTestCaseService, TestCaseService, CallTreeNode } from './default-test-case.service';

@NgModule({
  imports: [
    CommonModule,
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
