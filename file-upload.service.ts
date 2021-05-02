// File Upload v1.0
// https://github.com/JulianStoev/AngularFileUploadService

import { Injectable } from '@angular/core';

interface uploadInterface {
  id?: number;
  chunkSize?: number;
  instantUpload?: boolean;
  url: string;
  headers?: Object;
  start?: (arg0: ProgressEvent<EventTarget>) => void;
  progress?: (arg0: number) => void;
  abort?: (arg0: ProgressEvent<EventTarget>) => void;
  error?: (arg0: ProgressEvent<EventTarget>) => void;
  done?: (arg0: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {

  private data = {} as uploadInterface;

  private files = [] as Array<FormData>;

  public init(data: uploadInterface): void {
    this.data = data;
  }

  public readonly file = {
    remove: (index: number, callback?: () => void): void => {
      if (this.files[index]) {
        this.files.splice(index, 1);
      }
      if (callback) {
        callback();
      }
    },
    removeAll: (): void => {
      this.files = [];
    },
    count: (): number => {
      return this.files.length;
    },
    addData: (data: object, callback?: () => void): void => {
      if (this.file.count() === 0) {
        return;
      }
      this.files.forEach(file => {
        Object.keys(data).forEach(key => {
          file.append(key, data[key]);
        });
      });
      if (callback) {
        callback();
      }
    }
  };

  public onFile(event: Event): void {
    const file = Array.from((event.target as HTMLInputElement).files as FileList)[0];
    const filesize = file.size;

    if (!this.data.chunkSize || this.data.chunkSize >= filesize) {
      const formData = new FormData();
      if (this.data.id) {
        formData.append('id', this.data.id.toString());
      }
      formData.append('image', file, file.name);
      this.files.push(formData);
    } else {
      const count = Math.ceil(filesize / this.data.chunkSize);
      let start = 0;
      let end = Math.ceil(filesize / count);
      for (let i = 1; i <= count; i++) {
        const chunk = new FormData();
        if (this.data.id) {
          chunk.append('id', this.data.id.toString());
        }
        chunk.append('chunked', '1');
        chunk.append('parts', count.toString());
        chunk.append('part', i.toString());
        chunk.append('chunk_' + i, file.slice(start, end), 'chunk_' + i);
        start = end;
        end += Math.ceil(filesize / count);
        if (filesize < end) {
          end = filesize;
        }
        this.files.push(chunk);
      }
    }

    if (this.data.instantUpload) {
      this.upload();
    }
  }

  public upload(resp?): void {
    if (!this.files[0]) {
      if (this.data.done) {
        this.data.done(resp);
      }
      return;
    }
    this.XHRUpload(this.files[0], (response) => {
      if (response.success === 0) {
        console.error(response.message);
        return;
      }
      this.files.splice(0, 1);
      this.upload(response);
    });
  }

  private XHRUpload(file: FormData, callback: (arg0: any) => void): void {

    const xhr = new XMLHttpRequest();

    if (this.data.progress) {
      xhr.upload.onprogress = (e: ProgressEvent): void => {
        if (e.lengthComputable) {
          this.data.progress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    if (this.data.error) {
      xhr.upload.onerror = (e: ProgressEvent): void => {
        this.data.error(e);
      };
    }

    if (this.data.start) {
      xhr.onloadstart = (e): void => {
        this.data.start(e);
      };
    }

    if (this.data.abort) {
      xhr.upload.onabort = (e): void => {
        this.data.abort(e);
      };
    }

    xhr.onload = (e): void => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        let json;
        try {
          json = JSON.parse(xhr.responseText);
        } catch (e) {
          json = {success: 0, message: xhr.responseText};
        }
        callback(json);
      } else {
        if (typeof this.data.error == 'function') {
          this.data.error(e);
        }
      }
    };

    xhr.open('POST', this.data.url);
    if (this.data.headers) {
      Object.keys(this.data.headers).forEach(key => {
        xhr.setRequestHeader(key, this.data.headers[key]);
      });
    }
    xhr.send(file);
  }
}
