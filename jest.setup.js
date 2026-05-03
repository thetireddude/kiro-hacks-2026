// Jest setup file for configuring the test environment
require('@testing-library/jest-dom');

// Polyfill for Next.js Request/Response in Node environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this._body = init?.body;
    }
    
    async json() {
      return JSON.parse(this._body);
    }
    
    async text() {
      return this._body;
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    
    async json() {
      return JSON.parse(this.body);
    }
    
    async text() {
      return this.body;
    }
    
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
  };
}

// Polyfill for atob/btoa in Node environment
if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

if (typeof btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

// Polyfill for File in Node environment
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(parts, filename, options) {
      this.parts = parts;
      this.name = filename;
      this.type = options?.type || '';
    }
  };
}

// Polyfill for Blob in Node environment
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options?.type || '';
    }
  };
}
