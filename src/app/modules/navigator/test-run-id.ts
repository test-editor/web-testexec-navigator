// TODO: code clone management (this was cloned from web-testexec-details)
export class TestRunId {
  constructor(
    /**
     * ID of a test suite. A test suite is a sequence of tests to be executed.
     * The same test can be contained multiple times in a test suite,
     * to be executed at different points in the sequence.
     */
    public readonly testSuiteID: string,
    /** ID of a test suite run, i.e. a particular execution of a test suite. */
    public readonly testSuiteRunID: string,
    /** ID of a test run, i.e. a particular execution of a single test. */
    public readonly testRunID?: string,
    /** ID of a call tree node, e.g. a particular test step of the test referenced by the test run ID. */
    public readonly treeID?: string) {
      if (!testSuiteID || !testSuiteRunID || !testRunID) {
        throw new Error('Neither of Test Suite ID, Test Suite Run ID, and Test Run ID must be null or empty.');
      }
    }

  toPathString(): string {
    let pathString = encodeURIComponent(this.testSuiteID) + '/' + encodeURIComponent(this.testSuiteRunID);
    if (this.testRunID && this.testRunID.length > 0) {
      pathString += '/' + encodeURIComponent(this.testRunID);
      if (this.treeID && this.treeID.length > 0) {
        pathString += '/' + encodeURIComponent(this.treeID);
      }
    }
    return pathString;
  }
}
