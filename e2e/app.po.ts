import { browser, by, element, } from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get('/');
  }

  getRootNode() {
    return element(by.xpath('//div[@class="tree-view"]')).getText();
  }
}
