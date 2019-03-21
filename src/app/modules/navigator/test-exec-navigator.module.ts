import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { HttpProviderService, TreeViewerModule } from '@testeditor/testeditor-commons';
import { TestCaseServiceConfig } from '../test-case-service/test-case.service.config';
import { TestCaseServiceModule } from '../test-case-service/test-case.service.module';
import { TestExecutionServiceConfig } from '../test-execution-service/test-execution.service.config';
import { TestExecutionServiceModule } from '../test-execution-service/test-execution.service.module';
import { TestExecNavigatorComponent } from './test-exec-navigator.component';
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
        TestExecutionServiceModule.forRoot(testExecutionServiceConfig).providers,
        HttpProviderService
      ]
    };
  }
}
