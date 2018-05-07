import { TestBed, inject, fakeAsync } from '@angular/core/testing';

import { DefaultTestCaseService, TestCaseService } from './default.test.case.service';
import { TestCaseServiceConfig } from './test.case.service.config';
import { MessagingService, MessagingModule } from '@testeditor/messaging-service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';

describe('TestCaseService', () => {

  let serviceConfig: TestCaseServiceConfig;
  let messagingService: MessagingService;
  let httpClient: HttpClient;

  beforeEach(() => {
    serviceConfig = new TestCaseServiceConfig();
    serviceConfig.testCaseServiceUrl = 'http://localhost:8080';

    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule,
        MessagingModule.forRoot()
      ],
      providers: [
        { provide: TestCaseServiceConfig, useValue: serviceConfig },
        { provide: TestCaseService, useClass: DefaultTestCaseService },
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

  it('should be created', inject([TestCaseService], (testCaseService: TestCaseService) => {
    expect(testCaseService).toBeTruthy();
  }));

  it('invokes REST endpoint with encoded path', fakeAsync(inject([HttpTestingController, TestCaseService],
    (httpMock: HttpTestingController, testCaseService: TestCaseService) => {
    // given
    const tclFilePath = 'path/to/file?.tcl';
    const expectedCallTreeNode = { displayName: 'my-root-node', children: [] };
    const expectedRequest = {
      method: 'GET',
      url: serviceConfig.testCaseServiceUrl + '/test-case/call-tree?resource=path/to/file%3F.tcl'
    };

    // when
    testCaseService.getCallTree(tclFilePath,

      // then
      response => {
        expect(response).toEqual(expectedCallTreeNode);
      });

    httpMock.match(expectedRequest)[0].flush(expectedCallTreeNode);
  })));

});
