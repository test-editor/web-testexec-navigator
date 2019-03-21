import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { TestExecutionState } from './test-execution-state';
import { TestExecutionServiceConfig } from './test-execution.service.config';

export class ExecutedCallTree {
  testSuiteId: string;
  testSuiteRunId: string;
  resourcePaths: string[];
  testRuns: ExecutedTestRunCallTree[];
  status?: string;
  started?: string;
}

export class ExecutedTestRunCallTree {
  source: string;
  commitId: string;
  testRunId: string;
  started?: string;
  children: ExecutedCallTreeNode[];
  status?: string;
}

export class ExecutedCallTreeNode {
  id: string;
  node: string;
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

export interface TestSuiteExecutionStatus {
  resourceURL: string;
  status: TestExecutionState;
}

export interface AllStatusResponse {
  key: { suiteId: string, suiteRunId: string, caseRunId?: string, callTreeId?: string };
  status: string;
}

export abstract class TestExecutionService {
  abstract async getCallTree(resourceURL: string): Promise<ExecutedCallTree>;
  /**
   * Request to create a test suite from a list of tests, and start a test suite run.
   * @param paths the paths identifying the tests to be included in the test suite.
   * Tests will be executed in the order they are provided. The same test can be included multiple times.
   * @returns the resource url of the created test suite, which can be queried for status updates.
   */
  abstract async execute(...paths: string[]): Promise<string>;
  /**
   * Request the current test execution status of a test suite.
   * @param url the resource url of a test suite.
   * @returns the execution status of the test suite.
   */
  abstract getStatus(url: string): Promise<TestSuiteExecutionStatus>;
  abstract getAllStatus(): Promise<TestSuiteExecutionStatus[]>;

  /**
   * Request that a previously started test suite run be terminated
   * @param url the resource url of a test suite.
   * If termination is unsuccessful, an exception will be thrown.
   */
  abstract async terminate(url: string): Promise<void>;
}

@Injectable()
export class DefaultTestExecutionService extends TestExecutionService {

  private static readonly executeURLPath = 'launch-new';
  private static readonly statusAllURLPath = 'status';
  private static readonly statusURLPath = '?status&wait';
  private serviceUrl: string;

  constructor(config: TestExecutionServiceConfig,
              private httpClientProvider: HttpProviderService) {
    super();
    this.serviceUrl = config.testExecutionServiceUrl;
  }

  async getCallTree(resourceURL: string): Promise<ExecutedCallTree> {
    const http = await this.httpClientProvider.getHttpClient();
    return await http.get<ExecutedCallTree>(resourceURL).toPromise();
  }

  async execute(...paths: string[]): Promise<string> {
    const http = await this.httpClientProvider.getHttpClient();
    const response = await http.post(`${this.serviceUrl}/${DefaultTestExecutionService.executeURLPath}`,
      paths, {observe: 'response'}).toPromise();
    console.log(`Execution of test suite was started. Test suite resource URL is ${response.headers.get('location')}.`);
    return response.headers.get('location');
  }

  async getStatus(url: string): Promise<TestSuiteExecutionStatus> {
    const http = await this.httpClientProvider.getHttpClient();
    const stateText = await http.get(url + DefaultTestExecutionService.statusURLPath, { responseType: 'text' }).toPromise();
    return { resourceURL: url, status: this.toTestExecutionState(stateText) };
  }

  async getAllStatus(): Promise<TestSuiteExecutionStatus[]> {
    const http = await this.httpClientProvider.getHttpClient();
    const allStatus = await http.get<AllStatusResponse[]>(
      `${this.serviceUrl}/${DefaultTestExecutionService.statusAllURLPath}`).toPromise();
    return allStatus.map((entry) => ({
      resourceURL: `${this.serviceUrl}/${entry.key.suiteId}/${entry.key.suiteRunId}`,
      status: this.toTestExecutionState(entry.status) }));
  }

  async terminate(url: string): Promise<void> {
    const http = await this.httpClientProvider.getHttpClient();
    try {
      return await http.delete<void>(url).toPromise();
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        console.error(error.message, error);
        throw new Error (error.error);
      } else if (error instanceof Error) {
        console.error(error.message, error);
        throw error;
      } else {
        console.error(error);
        throw new Error(error);
      }
    }
  }

  private toTestExecutionState(state: string): TestExecutionState {
    switch (state) {
      case 'RUNNING': return TestExecutionState.Running;
      case 'FAILED': return TestExecutionState.LastRunFailed;
      case 'SUCCESS': return TestExecutionState.LastRunSuccessful;
      case 'IDLE': return TestExecutionState.Idle;
      default: return TestExecutionState.Idle;
    }
  }

}
