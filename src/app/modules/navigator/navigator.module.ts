import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigatorComponent } from './navigator.component';
import { TestCaseServiceModule } from '../test-case-service/test.case.service.module';
import { TestCaseServiceConfig } from '../test-case-service/test.case.service.config';
import { TreeViewerModule } from '../tree-viewer/tree-viewer.module';
import { TreeViewerComponent } from '../tree-viewer/tree-viewer.component';

@NgModule({
  imports: [
    CommonModule, TreeViewerModule
  ],
  declarations: [
    NavigatorComponent
  ],
  exports: [
    NavigatorComponent
  ]
})
export class NavigatorModule {
  static forRoot(testCaseServiceConfig: TestCaseServiceConfig): ModuleWithProviders {
    return {
      ngModule: NavigatorModule,
      providers: [
        TestCaseServiceModule.forRoot(testCaseServiceConfig).providers
      ]
    };
  }
}
