import { TestExecutionService, DefaultTestExecutionService, ExecutedCallTree } from './test.execution.service';
import { TestExecutionServiceConfig } from './test.execution.service.config';
import { inject, TestBed, fakeAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';

export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_CREATED = 201;

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
        { provide: TestExecutionService, useClass: DefaultTestExecutionService },
        { provide: TestExecutionServiceConfig, useValue: serviceConfig },

        HttpClient
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
      const mockResponse: ExecutedCallTree = { testSuiteId: '1234', testSuiteRunId: '5678', resources: null, testRuns: null };

      // when
      executionService.getCallTree(testSuiteResourceUrl,

        // then
       (node) => {
          expect(node).toEqual({ testSuiteId: '1234', testSuiteRunId: '5678', resources: null, testRuns: null });
        });

      httpMock.match(testExecutionRequest)[0].flush(mockResponse);
    })));

});
