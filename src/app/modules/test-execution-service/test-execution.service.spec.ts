import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { DefaultTestExecutionService, ExecutedCallTree, TestExecutionService } from './test-execution.service';
import { TestExecutionServiceConfig } from './test-execution.service.config';

export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_CREATED = 201;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

describe('TestExecutionService', () => {
  let serviceConfig: TestExecutionServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;

  beforeEach(() => {
    serviceConfig = new TestExecutionServiceConfig();
    serviceConfig.testExecutionServiceUrl = 'http://localhost:9080/tests';

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        HttpClientModule,
        MessagingModule.forRoot()
      ],
      providers: [
        HttpProviderService,
        HttpClient,
        { provide: TestExecutionService, useClass: DefaultTestExecutionService },
        { provide: TestExecutionServiceConfig, useValue: serviceConfig },
      ]
    });
    messagingService = TestBed.get(MessagingService);
    httpClient = TestBed.get(HttpClient);

    const subscription = messagingService.subscribe('httpClient.needed', () => {
      subscription.unsubscribe();
      messagingService.publish('httpClient.supplied', { httpClient: httpClient });
    });
  });

  it('returns ExecutedCallTree json when called', fakeAsync(inject([HttpTestingController, TestExecutionService],
    (httpMock: HttpTestingController, executionService: TestExecutionService) => {
      // given
      const testSuiteResourceUrl = 'http://example.org/test-suite/1234/5678';
      const testExecutionRequest = {
        method: 'GET',
        url: testSuiteResourceUrl
      };
      const mockResponse: ExecutedCallTree = { testSuiteId: '1234', testSuiteRunId: '5678', resourcePaths: null, testRuns: null };

      // when
      executionService.getCallTree(testSuiteResourceUrl)

      // then
      .then((node) => {
        expect(node).toEqual({ testSuiteId: '1234', testSuiteRunId: '5678', resourcePaths: null, testRuns: null });
      });
      tick();

      httpMock.match(testExecutionRequest)[0].flush(mockResponse);
    })));

    it('terminate makes DELETE request', fakeAsync(inject([HttpTestingController, TestExecutionService],
      (httpMock: HttpTestingController, executionService: TestExecutionService) => {
        // given
        const testSuiteResourceUrl = 'http://example.org/test-suite/1234/5678';
        const testExecutionRequest = {
          method: 'DELETE',
          url: testSuiteResourceUrl
        };

        // when
        executionService.terminate(testSuiteResourceUrl)

        // then
        .then(() => expect().nothing());
        tick();
        httpMock.expectOne(testExecutionRequest).flush(null, {status: HTTP_STATUS_OK, statusText: 'OK'});
      })));

      it('terminate throws exception if backend responds with status 500', fakeAsync(inject([HttpTestingController, TestExecutionService],
        (httpMock: HttpTestingController, executionService: TestExecutionService) => {
          // given
          const serverErrorMessage = 'Could not terminate test';
          const testSuiteResourceUrl = 'http://example.org/test-suite/1234/5678';
          const testExecutionRequest = {
            method: 'DELETE',
            url: testSuiteResourceUrl
          };

          // when
          executionService.terminate(testSuiteResourceUrl)

          // then
          .then(() => fail('expected exception to be trown!'))
          .catch((error: Error) => expect(error.message).toEqual(serverErrorMessage));
          tick();
          httpMock.expectOne(testExecutionRequest).flush(serverErrorMessage,
            {status: HTTP_STATUS_INTERNAL_SERVER_ERROR, statusText: 'Internal Server Error'});
        })));
});
