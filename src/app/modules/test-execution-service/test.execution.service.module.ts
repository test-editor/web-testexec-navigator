import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestExecutionServiceConfig } from './test.execution.service.config';
import { TestExecutionService, DefaultTestExecutionService, ExecutedCallTree, ExecutedCallTreeNode } from './test.execution.service';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    DefaultTestExecutionService, ExecutedCallTree, ExecutedCallTreeNode
  ],
  exports: [
    DefaultTestExecutionService, ExecutedCallTree, ExecutedCallTreeNode
  ]
})
export class TestExecutionServiceModule {
  static forRoot(testExecutionServiceConfig: TestExecutionServiceConfig): ModuleWithProviders {
    return {
      ngModule: TestExecutionServiceModule,
      providers: [
        { provide: TestExecutionServiceConfig, useValue: testExecutionServiceConfig },
        { provide: TestExecutionService, useClass: DefaultTestExecutionService }
      ]
    };
  }
}
