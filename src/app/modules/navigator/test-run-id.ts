// TODO: code clone management (this was partially cloned from web-testexec-details)
export class TestRunId {
  constructor(
    public testSuiteID: string,
    public testSuiteRunID: string,
    public testRunID?: string,
    public treeID?: string) {}

  createChildID(nodeID: string): TestRunId {
    const childID = new TestRunId(this.testSuiteID, this.testSuiteRunID);
    if (this.testRunID) {
      childID.treeID = nodeID;
    } else {
      childID.testRunID = nodeID;
    }
    return childID;
  }

  toPathString(): string {
    let pathString = this.testSuiteID + '/' + this.testSuiteRunID;
    if (this.testRunID && this.testRunID.length > 0) {
      pathString += '/' + this.testRunID;
      if (this.treeID && this.treeID.length > 0) {
        pathString += '/' + this.treeID;
      }
    }
    return pathString;
  }
}
