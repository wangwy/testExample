/**
 * Created by wangwy on 15-9-1.
 */
EPUBJS.Chapter = function(spineObject){
  this.href = spineObject.href;
  this.absolute = spineObject.url;
  this.id = spineObject.id;
  this.spinePos = spineObject.index;
  this.properties = spineObject.properties;
  this.manifestProperties = spineObject.manifestProperties;
  this.linear = spineObject.linear;
  this.pages = 1;
  this.deferred = new RSVP.defer();
  this.loaded = this.deferred.promise;
};

/**
 * 获得章节的url
 */
EPUBJS.Chapter.prototype.url = function(){
  var deferred = new RSVP.defer();
  var url;

  url = this.absolute;
  deferred.resolve(url);
  return deferred.promise;
};

/**
 * 复制一个document给chapter
 * @param _document
 */
EPUBJS.Chapter.prototype.setDocument = function(_document){
  var uri = _document.namespaceURI;
  this.document = _document.implementation.createDocument(uri, null, null);

  this.contents = this.document.importNode(_document.documentElement, true);
  this.document.appendChild(this.contents);
  if(!this.document.evaluate && document.evaluate){
    this.document.evaluate = document.evaluate;
  }
};