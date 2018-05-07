import { TestCaseServiceConfig } from './test-case-service-config';
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessagingService } from '@testeditor/messaging-service';

// code duplication with persistence service and test-editor-web, removal planned with next refactoring
const HTTP_CLIENT_NEEDED = 'httpClient.needed';
const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

// API provided by service backend
export class CallTreeNode {
  displayName: string;
  children: CallTreeNode[];
}

export abstract class TestCaseService {
  abstract getCallTree(path: string, onResponse?: (some: any) => void, onError?: (error: any) => void): void;
}


@Injectable()
export class DefaultTestCaseService extends TestCaseService {

  private static readonly callTreeURLPath = '/test-case/call-tree';
  private serviceUrl: string;

  private cachedHttpClient: HttpClient;

  constructor(config: TestCaseServiceConfig, private messagingService: MessagingService) {
    super();
    this.serviceUrl = config.testCaseServiceUrl;
  }

  getCallTree(path: string,
              onResponse?: (status: CallTreeNode) => void,
              onError?: (error: any) => void): void {
    this.httpClientExecute(httpClient => {
      return httpClient.get<CallTreeNode>(this.getURL(path, DefaultTestCaseService.callTreeURLPath))
        .toPromise();
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
    if (this.cachedHttpClient) {
      this.httpClientExecuteCached(onHttpClient, onResponse, onError);
    } else {
      const responseSubscription = this.messagingService.subscribe(HTTP_CLIENT_SUPPLIED, (httpClientPayload) => {
        responseSubscription.unsubscribe();
        this.cachedHttpClient = httpClientPayload.httpClient;
        this.httpClientExecuteCached(onHttpClient, onResponse, onError);
      });
      this.messagingService.publish(HTTP_CLIENT_NEEDED, null);
    }
  }

  private httpClientExecuteCached(onHttpClient: (httpClient: HttpClient) => Promise<any>,
                                  onResponse?: (some: any) => void,
                                  onError?: (error: any) => void): void {
    onHttpClient(this.cachedHttpClient).then((some) => {
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
