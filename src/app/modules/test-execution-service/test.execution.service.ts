import { TestExecutionServiceConfig } from './test.execution.service.config';
import { MessagingService } from '@testeditor/messaging-service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { resource } from 'selenium-webdriver/http';

// code duplication with persistence service and test-editor-web, removal planned with next refactoring
const HTTP_CLIENT_NEEDED = 'httpClient.needed';
const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export class ExecutedCallTree {
  testSuiteId: string;
  testSuiteRunId: string;
  resources: string[]; // TODO or is it supposed to be resourcePaths?
  testRuns: ExecutedCallTreeNode[];
  status?: string;
  started?: string;
}

export class ExecutedCallTreeNode {
  id: string;
  type: string;
  message?: string;
  enter: string;
  leave?: string;
  preVariables?: any;
  children?: ExecutedCallTreeNode[];
  postVariables?: any;
  status?: string;
  fixtureException?: any; // any json object (that is a map<any>)
  exception?: string;
  assertionError?: string;
}

export abstract class TestExecutionService {
  abstract getCallTree(resourceURL: string,
                       onResponse?: (node: ExecutedCallTree) => void,
                       onError?: (error: any) => void): void;
}

@Injectable()
export class DefaultTestExecutionService extends TestExecutionService {

  private static readonly callTreeURLPath = '/call-tree';
  private serviceUrl: string;

  private httpClient: HttpClient;

  constructor(config: TestExecutionServiceConfig, private messagingService: MessagingService) {
    super();
    this.serviceUrl = config.testExecutionServiceUrl;
  }

  getCallTree(resourceURL: string,
              onResponse?: (node: ExecutedCallTree) => void,
              onError?: (error: any) => void): void {
    this.httpClientExecute(
      httpClient => {
        console.log('got http client');
        return httpClient.get<ExecutedCallTree>(resourceURL).toPromise();
      },
      onResponse,
      onError);
  }

  // code duplication with xxx service
  private httpClientExecute(onHttpClient: (httpClient: HttpClient) => Promise<any>,
                            onResponse?: (some: any) => void,
                            onError?: (error: any) => void): void {
    if (this.httpClient) {
      this.execute(this.httpClient, onHttpClient, onResponse, onError);
    } else {
      const responseSubscription = this.messagingService.subscribe(HTTP_CLIENT_SUPPLIED, (httpClientPayload) => {
        responseSubscription.unsubscribe();
        this.httpClient = httpClientPayload.httpClient;
        this.execute(this.httpClient, onHttpClient, onResponse, onError);
      });
      this.messagingService.publish(HTTP_CLIENT_NEEDED, null);
    }
  }

  private execute(httpClient: HttpClient,
                  onHttpClient: (httpClient: HttpClient) => Promise<any>,
                  onResponse?: (some: any) => void,
                  onError?: (error: any) => void): void {
    onHttpClient(httpClient).then((some) => {
      if (onResponse) {
        onResponse(some);
      }
    }).catch((error) => {
      if (onError) {
        onError(error);
      } else {
        throw(error);
      }
    });
  }

}
