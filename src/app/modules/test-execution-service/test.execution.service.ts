import { TestExecutionServiceConfig } from './test.execution.service.config';
import { MessagingService } from '@testeditor/messaging-service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// code duplication with persistence service and test-editor-web, removal planned with next refactoring
const HTTP_CLIENT_NEEDED = 'httpClient.needed';
const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export class ExecutedCallTree {
  Source: string;
  CommitID: string;
  Children: ExecutedCallTreeNode[];
  Status?: string;
  Started?: string;
}

export class ExecutedCallTreeNode {
  ID: string;
  Type: string;
  Message?: string;
  Enter: string;
  Leave?: string;
  PreVariables?: VariableValue[];
  Children?: ExecutedCallTreeNode[];
  PostVariables?: VariableValue[];
  Status?: string;
}

export class VariableValue {
  Key: String;
  Value: String;
}

export abstract class TestExecutionService {
  abstract getCallTree(path: string,
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

  getCallTree(path: string,
              onResponse?: (node: ExecutedCallTree) => void,
              onError?: (error: any) => void): void {
    this.httpClientExecute(
      httpClient => {
        console.log('got http client');
        return httpClient.get<ExecutedCallTree>(this.getURL(path, DefaultTestExecutionService.callTreeURLPath)).toPromise();
      },
      onResponse,
      onError);
  }

  private getURL(workspaceElementPath: string, urlPath: string = ''): string {
    const encodedPath = workspaceElementPath.split('/').map(encodeURIComponent).join('/');
    return `${this.serviceUrl}${urlPath}?resource=${encodedPath}`;
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
