import { TestCaseServiceConfig } from './test-case.service.config';
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';

// API provided by service backend
export class CallTreeNode {
  displayName: string;
  treeId: string;
  children: CallTreeNode[];
}

export abstract class TestCaseService {
  abstract async getCallTree(path: string): Promise<CallTreeNode>;
}


@Injectable()
export class DefaultTestCaseService extends TestCaseService {

  private static readonly callTreeURLPath = '/call-tree';
  private serviceUrl: string;

  constructor(config: TestCaseServiceConfig, private httpClientProvider: HttpProviderService) {
    super();
    this.serviceUrl = config.testCaseServiceUrl;
  }

  async getCallTree(path: string): Promise<CallTreeNode> {
    console.log('DefaultTestCaseService.getCallTree');
    const requestURL =  `${this.serviceUrl}${DefaultTestCaseService.callTreeURLPath}?resource=${encodeURIComponent(path)}`;
    const http = await this.httpClientProvider.getHttpClient();
    console.log('got http client');
    return await http.get<CallTreeNode>(requestURL).toPromise();
  }

}
