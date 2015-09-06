/**
 * Created by wangwy on 15-8-28.
 */
var EPUBJS = EPUBJS || {};
EPUBJS.core = {};

/**
 * 根据id获得element
 * @param elem
 * @returns {HTMLElement}
 */
EPUBJS.core.getEl = function (elem) {
  return document.getElementById(elem);
};

/**
 * 格式化url路径
 * @param url
 * @returns {{protocol: string, host: string, path: string, origin: string, directory: string, base: string, filename: string, extension: string, fragment: string, href: *}}
 */
EPUBJS.core.uri = function (url) {
  var uri = {
        protocol: '',
        host: '',
        path: '',
        origin: '',
        directory: '',
        base: '',
        filename: '',
        extension: '',
        fragment: '',
        href: url
      },
      blob = url.indexOf('blob:'),
      doubleSlash = url.indexOf('://'),
      search = url.indexOf('?'),
      fragment = url.indexOf("#"),
      withoutProtocol,
      dot,
      firstSlash;

  if (blob === 0) {
    uri.protocol = "blob";
    uri.base = url.indexOf(0, fragment);
    return uri;
  }

  if (fragment != -1) {
    uri.fragment = url.slice(fragment + 1);
    url = url.slice(0, fragment);
  }

  if (search != -1) {
    uri.search = url.slice(search + 1);
    url = url.slice(0, search);
    href = url;
  }

  if (doubleSlash != -1) {
    uri.protocol = url.slice(0, doubleSlash);
    withoutProtocol = url.slice(doubleSlash + 3);
    firstSlash = withoutProtocol.indexOf('/');

    if (firstSlash === -1) {
      uri.host = uri.path;
      uri.path = "";
    } else {
      uri.host = withoutProtocol.slice(0, firstSlash);
      uri.path = withoutProtocol.slice(firstSlash);
    }


    uri.origin = uri.protocol + "://" + uri.host;

    uri.directory = EPUBJS.core.folder(uri.path);

    uri.base = uri.origin + uri.directory;
    // return origin;
  } else {
    uri.path = url;
    uri.directory = EPUBJS.core.folder(url);
    uri.base = uri.directory;
  }

  //-- Filename
  uri.filename = url.replace(uri.base, '');
  dot = uri.filename.lastIndexOf('.');
  if (dot != -1) {
    uri.extension = uri.filename.slice(dot + 1);
  }
  return uri;
};

/**
 * 获取url的路径
 * @param url
 * @returns {string}
 */
EPUBJS.core.folder = function (url) {

  var lastSlash = url.lastIndexOf('/');

  if (lastSlash == -1) var folder = '';

  folder = url.slice(0, lastSlash + 1);

  return folder;

};

/**
 * 获取路径的绝对路径
 * @param base
 * @param path
 * @returns {*}
 */
EPUBJS.core.resolveUrl = function (base, path) {
  var url,
      segments = [],
      uri = EPUBJS.core.uri(path),
      folders = base.split("/"),
      paths;

  if (uri.host) {
    return path;
  }

  folders.pop();

  paths = path.split("/");
  paths.forEach(function (p) {
    if (p === "..") {
      folders.pop();
    } else {
      segments.push(p);
    }
  });

  url = folders.concat(segments);

  return url.join("/");
};

EPUBJS.core.request = function (url, type, withCredentials) {
  var supportsURL = window.URL;
  var BLOB_RESPONSE = supportsURL ? "blob" : "arraybuffer";

  var deferred = new RSVP.defer();

  var xhr = new XMLHttpRequest();

  //-- Check from PDF.js:
  //   https://github.com/mozilla/pdf.js/blob/master/web/compatibility.js
  var xhrPrototype = XMLHttpRequest.prototype;

  if (!('overrideMimeType' in xhrPrototype)) {
    // IE10 might have response, but not overrideMimeType
    Object.defineProperty(xhrPrototype, 'overrideMimeType', {
      value: function xmlHttpRequestOverrideMimeType(mimeType) {
      }
    });
  }
  if (withCredentials) {
    xhr.withCredentials = true;
  }
  xhr.open("GET", url, true);
  xhr.onreadystatechange = handler;

  if (type == 'blob') {
    xhr.responseType = BLOB_RESPONSE;
  }

  if (type == "json") {
    xhr.setRequestHeader("Accept", "application/json");
  }

  if (type == 'xml') {
    xhr.overrideMimeType('text/xml');
  }

  if (type == "binary") {
    xhr.responseType = "arraybuffer";
  }

  xhr.send();

  function handler() {
    if (this.readyState === this.DONE) {
      if (this.status === 200) { // || this.responseXML-- Firefox is reporting 0 for blob urls
        var r;

        if (type == 'xml') {
          r = new DOMParser().parseFromString(this.responseText, 'text/xml');
        } else if (type == 'json') {
          r = JSON.parse(this.responseText);
        } else if (type == 'blob') {

          if (supportsURL) {
            r = this.responseText;
          } else {
            //-- Safari doesn't support responseType blob, so create a blob from arraybuffer
            r = new Blob([this.responseText]);
          }

        } else {
          r = this.responseText;
        }

        deferred.resolve(r);
      } else {
        deferred.reject({
          message: this.responseText,
          stack: new Error().stack
        });
      }
    }
  }

  return deferred.promise;
};

/**
 * 创建uuid http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
 * @returns {string}
 */
EPUBJS.core.uuid = function(){
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });

  return uuid;
};