/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Section = function(item){
  this.idref = item.idref;
  this.linear = item.linear;
  this.properties = item.properties;
  this.index = item.index;
  this.href = item.href;
  this.url = item.url;
  this.next = item.next;
  this.prev = item.prev;

  this.hooks = {};
  this.hooks.replacements = new EPUBJS.Hook(this);

  this.hooks.replacements.register(this.replacements);
};


EPUBJS.Section.prototype.replacements = function(_document){
  var task = new RSVP.defer();
  var base = _document.createElement("base");
  var head;
  base.setAttribute("href", this.url);

  if(_document){
    head = _document.querySelector("head");
  }
  if(head){
    head.insertBefore(base, head.firstChild);
    task.resolve();
  }else{
    task.reject(new Error("没有要插入的head"));
  }
  return task.promise;
};