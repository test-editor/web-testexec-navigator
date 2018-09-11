import { TestCaseServiceConfig } from './test-case.service.config';
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '../http-provider-service/http-provider.service';

// code duplication with persistence service and test-editor-web, removal planned with next refactoring
const HTTP_CLIENT_NEEDED = 'httpClient.needed';
const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

// API provided by service backend
export class CallTreeNode {
  displayName: string;
  children: CallTreeNode[];
}

export abstract class TestCaseService {
  abstract async getCallTree(path: string): Promise<CallTreeNode>;
}


@Injectable()
export class DefaultTestCaseService extends TestCaseService {

  private static readonly callTreeURLPath = '/call-tree';
  private serviceUrl: string;

  constructor(config: TestCaseServiceConfig, private messagingService: MessagingService, private httpClientProvider: HttpProviderService) {
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
