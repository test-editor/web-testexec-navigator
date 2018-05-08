import { AppPage } from './app.po';

describe('testexec-navigator App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display sample tree', () => {
    page.navigateTo();
    expect(page.getRootNode()).toEqual('root');
  });
});
