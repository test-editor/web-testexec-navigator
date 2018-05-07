import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { TreeViewerComponent } from './tree-viewer.component';
import { TreeNode } from './tree-node';
import { TreeViewerConfig } from './tree-viewer-config';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('TreeViewerComponent', () => {
  let component: TreeViewerComponent;
  let fixture: ComponentFixture<TreeViewerComponent>;

  const singleEmptyTreeNode: () => TreeNode = () => ({
    name: 'tree node',
    children: [],
    leafCssClasses: 'fa-file'
  });

  const treeNodeWithSubNodes: () => TreeNode = () => ({
    name: 'parent node',
    collapsedCssClasses: 'fa-chevron-right',
    expandedCssClasses: 'fa-chevron-down',
    leafCssClasses: 'fa-folder',
    expanded: false,
    children: [
      { name: 'child node 1', children: [] },
      { name: 'child node 2', children: [] },
      { name: 'child node 3', children: [] }
    ]
  });

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TreeViewerComponent ]
    })
    .compileComponents();
  }));

  function getRootTreeViewItemKey(): DebugElement {
    return fixture.debugElement.query(By.css('.tree-view .tree-view-item-key'));
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TreeViewerComponent);
    component = fixture.componentInstance;
    component.model = null;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides sub elements of collapsed node', fakeAsync(() => {
    // given
    component.model = treeNodeWithSubNodes();

    // when
    fixture.detectChanges();
    tick();

    // then
    const treeview = fixture.debugElement.query(By.css('.tree-view'));
    const treeitems = treeview.queryAll(By.css('.tree-view-item-key'));
    expect(treeitems.length).toEqual(1);
    expect(treeitems[0].nativeElement.innerText).toContain('parent node');
  }));

  it('shows sub elements of expanded noded', fakeAsync(() => {
    // given
    component.model = treeNodeWithSubNodes();

    // when
    component.model.expanded = true;
    fixture.detectChanges();
    tick();

    // then
    const treeview = fixture.debugElement.query(By.css('.tree-view'));
    const treeitems = treeview.queryAll(By.css('.tree-view-item-key'));
    expect(treeitems.length).toEqual(4);
    expect(treeitems[0].nativeElement.innerText).toContain('parent node');
    expect(treeitems[1].nativeElement.innerText).toContain('child node 1');
    expect(treeitems[2].nativeElement.innerText).toContain('child node 2');
    expect(treeitems[3].nativeElement.innerText).toContain('child node 3');
  }));

  it('performs configured action when double-clicked', () => {
    // given
    component.model = treeNodeWithSubNodes();
    component.config = {
      onDoubleClick: (node) => node.expanded = true
    };
    fixture.detectChanges();

    // when
    getRootTreeViewItemKey().triggerEventHandler('dblclick', null);

    // then
    expect(component.model.expanded).toBeDefined();
    expect(component.model.expanded).toBeTruthy();
  });

  it('uses model`s leaf style when expanded is undefined', () => {
    // given
    const treeNode = singleEmptyTreeNode();
    component.model = treeNode;

    // when
    fixture.detectChanges();

    // then
    const icon = getRootTreeViewItemKey().query(By.css('.icon-type'));
    expect(icon.classes[treeNode.leafCssClasses]).toBeTruthy();
  });

  it('uses model`s collapsed style when unexpanded', () => {
    // given
    const treeNode = treeNodeWithSubNodes();
    component.model = treeNode;

    // when
    fixture.detectChanges();

    // then
    const icon = getRootTreeViewItemKey().query(By.css('.icon-type'));
    expect(icon.classes[treeNode.collapsedCssClasses]).toBeTruthy();
  });

  it('uses model`s expanded style when expanded', () => {
    // given
    const treeNode = treeNodeWithSubNodes();
    treeNode.expanded = true;
    component.model = treeNode;

    // when
    fixture.detectChanges();

    // then
    const icon = getRootTreeViewItemKey().query(By.css('.icon-type'));
    expect(icon.classes[treeNode.expandedCssClasses]).toBeTruthy();
  });

  it('performs configured action when icon is clicked', () => {
    // given
    component.model = treeNodeWithSubNodes();
    component.config = {
      onIconClick: (node) => node.expanded = true
    };
    fixture.detectChanges();
    const icon = getRootTreeViewItemKey().query(By.css('.icon-type'));

    // when
    icon.triggerEventHandler('click', null);

    // then
    expect(component.model.expanded).toBeDefined();
    expect(component.model.expanded).toBeTruthy();
  });

  it('performs configured action when node is clicked', () => {
    // given
    component.model = treeNodeWithSubNodes();
    let hasBeenClicked = false;
    component.config = {
      onClick: (node) => hasBeenClicked = true
    };
    fixture.detectChanges();

    // when
    getRootTreeViewItemKey().triggerEventHandler('click', null);

    // then
    expect(hasBeenClicked).toBeTruthy();
  });

  it('has css class "active" if given by the model state', () => {
    // given
    component.model = singleEmptyTreeNode();

    fixture.detectChanges();
    expect(getRootTreeViewItemKey().classes.active).toBeFalsy();

    // when
    component.model.active = true;
    fixture.detectChanges();

    // then
    expect(getRootTreeViewItemKey().classes.active).toBeTruthy();
  });

  it('has css class "selected" if given by the model state', () => {
    // given
    component.model = singleEmptyTreeNode();

    fixture.detectChanges();
    expect(getRootTreeViewItemKey().classes.selected).toBeFalsy();

    // when
    component.model.selected = true;
    fixture.detectChanges();

    // then
    expect(getRootTreeViewItemKey().classes.selected).toBeTruthy();
  });

});
