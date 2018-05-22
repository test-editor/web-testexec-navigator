import { TestExecutionServiceConfig } from './test.execution.service.config';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export class ExecutedCallTree {
  Source: String;
  CommitID: String;
  Children: ExecutedCallTreeNode[];
}

export class ExecutedCallTreeNode {
  ID: String;
  Type: String;
  Message?: String;
  Enter: String;
  Leave?: String;
  PreVariables?: VariableValue[];
  Children?: ExecutedCallTreeNode[];
  PostVariables?: VariableValue[];
  Status?: String;
}

export class VariableValue {
  Key: String;
  Value: String;
}

export abstract class TestExecutionService {
  abstract getCallTree(path: string): Promise<ExecutedCallTree>;
}

@Injectable()
export class DefaultTestExecutionService extends TestExecutionService {

  private static readonly callTreeURLPath = '/call-tree';
  private serviceUrl: string;

  constructor(private http: HttpClient, config: TestExecutionServiceConfig) {
    super();
    this.serviceUrl = config.testExecutionServiceUrl;
  }

  getCallTree(path: string): Promise<ExecutedCallTree> {
    return this.http.get<ExecutedCallTree>(this.getURL(path, DefaultTestExecutionService.callTreeURLPath)).toPromise();
  }

  private getURL(workspaceElementPath: string, urlPath: string = ''): string {
    const encodedPath = workspaceElementPath.split('/').map(encodeURIComponent).join('/');
    return `${this.serviceUrl}${urlPath}?resource=${encodedPath}`;
  }

}
