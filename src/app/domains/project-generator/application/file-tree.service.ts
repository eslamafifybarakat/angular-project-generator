import { Injectable } from '@angular/core';
import type { FileTreeNode, GeneratedFile } from '../domain/generated-file.model';

/**
 * Turns the flat generated-file list into a tree for the preview pane.
 *
 * Directories sort before files at every level, which is the order a developer
 * expects from a file explorer and from `tree`.
 */
@Injectable({ providedIn: 'root' })
export class FileTreeService {
  build(files: readonly GeneratedFile[], rootName: string): FileTreeNode {
    const root: FileTreeNode = {
      name: `${rootName}/`,
      path: '',
      isDirectory: true,
      children: [],
    };

    for (const file of files) {
      const segments = file.path.split('/');
      let cursor = root;
      segments.forEach((segment, depth) => {
        const isDirectory = depth < segments.length - 1;
        const path = segments.slice(0, depth + 1).join('/');
        let child = cursor.children.find((node) => node.name === segment);
        if (!child) {
          child = { name: segment, path, isDirectory, children: [] };
          cursor.children.push(child);
        }
        cursor = child;
      });
    }

    this.sort(root);
    return root;
  }

  /** Depth-first flatten, so the template can render one flat list with indents. */
  flatten(node: FileTreeNode, depth = 0): { node: FileTreeNode; depth: number }[] {
    const rows: { node: FileTreeNode; depth: number }[] = [];
    for (const child of node.children) {
      rows.push({ node: child, depth });
      if (child.isDirectory) {
        rows.push(...this.flatten(child, depth + 1));
      }
    }
    return rows;
  }

  private sort(node: FileTreeNode): void {
    node.children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      this.sort(child);
    }
  }
}
