import { Injectable } from '@angular/core';
import JSZip from 'jszip';

export interface RenderedFile {
  readonly path: string;
  readonly content: string;
}

export interface BuiltArchive {
  readonly blob: Blob;
  readonly byteSize: number;
}

/** Builds a real, downloadable ZIP archive from rendered file contents —
 * the counterpart to `FileContentService`, which turns paths into text. */
@Injectable({ providedIn: 'root' })
export class ZipBuilderService {
  async build(files: readonly RenderedFile[], rootFolder: string): Promise<BuiltArchive> {
    const zip = new JSZip();
    const root = zip.folder(rootFolder) ?? zip;
    for (const file of files) {
      root.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return { blob, byteSize: blob.size };
  }
}
