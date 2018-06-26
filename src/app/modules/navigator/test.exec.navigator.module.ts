import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestExecNavigatorComponent } from './test.exec.navigator.component';
import { TestCaseServiceModule } from '../test-case-service/test.case.service.module';
import { TestCaseServiceConfig } from '../test-case-service/test.case.service.config';
import { TreeViewerModule } from '@testeditor/testeditor-commons';
import { TestExecutionServiceModule } from '../test-execution-service/test.execution.service.module';
import { TestExecutionServiceConfig } from '../test-execution-service/test.execution.service.config';

@NgModule({
  imports: [
    CommonModule, TreeViewerModule
  ],
  declarations: [
    TestExecNavigatorComponent
  ],
  exports: [
    TestExecNavigatorComponent
  ]
})
export class TestExecNavigatorModule {
  static forRoot(testCaseServiceConfig: TestCaseServiceConfig,
                 testExecutionServiceConfig: TestExecutionServiceConfig): ModuleWithProviders {
    return {
      ngModule: TestExecNavigatorModule,
      providers: [
        TestCaseServiceModule.forRoot(testCaseServiceConfig).providers,
        TestExecutionServiceModule.forRoot(testExecutionServiceConfig).providers
      ]
    };
  }
}
