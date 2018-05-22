import { TestExecutionService, DefaultTestExecutionService, ExecutedCallTree } from './test.execution.service';
import { TestExecutionServiceConfig } from './test.execution.service.config';
import { inject, TestBed, fakeAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpClientModule } from '@angular/common/http';

export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_CREATED = 201;

describe('TestExecutionService', () => {
  let serviceConfig: TestExecutionServiceConfig;

  beforeEach(() => {
    serviceConfig = new TestExecutionServiceConfig();
    serviceConfig.testExecutionServiceUrl = 'http://localhost:9080/tests';

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpClientModule],
      providers: [
        { provide: TestExecutionService, useClass: DefaultTestExecutionService },
        { provide: TestExecutionServiceConfig, useValue: serviceConfig },
        HttpClient
      ]
    });
  });

  it('returns ExecutedCallTree json when called', fakeAsync(inject([HttpTestingController, TestExecutionService],
    (httpMock: HttpTestingController, executionService: TestExecutionService) => {
      // given
      const tclFilePath = 'test.tcl';
      const testExecutionRequest = {
        method: 'GET',
        url: serviceConfig.testExecutionServiceUrl + '/call-tree?resource=test.tcl'
      };
      const mockResponse: ExecutedCallTree = { CommitID: 'some', Source: 'source', Children: null };

      // when
      executionService.getCallTree(tclFilePath)

        // then
        .then(response => {
          expect(response).toEqual({ CommitID: 'some', Source: 'source', Children: null});
        });

      httpMock.match(testExecutionRequest)[0].flush(mockResponse);
    })));

});
