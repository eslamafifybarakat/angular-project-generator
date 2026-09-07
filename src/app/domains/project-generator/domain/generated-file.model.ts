/** A path the generator would write, plus why it is there. */
export interface GeneratedFile {
  readonly path: string;
  /** Which contract section put it in the list. */
  readonly reason: string;
}

export interface FileTreeNode {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly children: FileTreeNode[];
}
