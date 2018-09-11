// all events this components subscribes to and expects to be pushed by other components

// request execution of a test case,
// payload is the absolute path of the respective tcl
export const TEST_EXECUTE_REQUEST = 'test.execute.request';

export const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export interface TestRunCompletedPayload {
  path: string;
  resourceURL: string;
}
export const TEST_EXECUTION_FINISHED = 'test.execution.finished';

export interface NavigationOpenPayload {
  name: string;
  id: string;
}
export const NAVIGATION_OPEN = 'navigation.open';
