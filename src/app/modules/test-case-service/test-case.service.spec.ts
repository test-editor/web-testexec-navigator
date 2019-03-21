import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { MessagingModule, MessagingService } from '@testeditor/messaging-service';
import { HttpProviderService } from '@testeditor/testeditor-commons';
import { DefaultTestCaseService, TestCaseService } from './default-test-case.service';
import { TestCaseServiceConfig } from './test-case.service.config';


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
        HttpProviderService,
        HttpClient,
        { provide: TestCaseServiceConfig, useValue: serviceConfig },
        { provide: TestCaseService, useClass: DefaultTestCaseService },
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
    const expectedCallTreeNode = { displayName: 'my-root-node', treeId: 'ID', children: [] };
    const expectedRequest = {
      method: 'GET',
      url: serviceConfig.testCaseServiceUrl + '/call-tree?resource=path%2Fto%2Ffile%3F.tcl'
    };

    // when
    testCaseService.getCallTree(tclFilePath).then((response) => {
      expect(response).toEqual(expectedCallTreeNode);
    });
    tick();

    httpMock.match(expectedRequest)[0].flush(expectedCallTreeNode);
  })));

});
