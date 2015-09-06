/**
 * Created by wangwy on 15-8-28.
 */
EPUBJS.Render.Iframe = function () {
  this.iframe = null;
  this.document = null;
  this.window = null;
  this.docEl = null;
  this.bodyEl = null;

  this.leftPos = 0;
  this.pageWidth = 0;
};

/**
 * 创建iframe标签
 * @returns {null|*|EPUBJS.Render.Iframe.iframe}
 */
EPUBJS.Render.Iframe.prototype.createIframe = function () {
  this.iframe = document.createElement('iframe');
  this.iframe.id = "epubjs-iframe:" + EPUBJS.core.uuid();
  this.iframe.scrolling = "no";
  this.iframe.seamless = "seamless";
  this.iframe.style.border = "none";
  this.iframe.addEventListener("load", this.loaded.bind(this), false);
  return this.iframe;
};

/**
 * 当页面下载完成时所触发的事件
 */
EPUBJS.Render.Iframe.prototype.loaded = function () {
  var url = this.iframe.contentWindow.location.href;
  if (url != "about:blank") {
    this.trigger("render:loaded", url);
  }
};

/**
 * 根据章节页面加载iframe
 * @param chapter
 * @returns {*}
 */
EPUBJS.Render.Iframe.prototype.load = function(chapter){
  var render = this,
      deferred = new RSVP.defer();
  chapter.url().then(function(url){
    render.leftPos = 0;
    this.iframe.onload = function(e){
      render.document = render.iframe.contentDocument;
      render.docEl = render.document.documentElement;
      render.headEl = render.document.head;
      render.bodyEl = render.document.body || render.document.querySelector("body");
      render.window = render.iframe.contentWindow;
      render.window.addEventListener("resize", render.resized.bind(render), false);

      if(render.bodyEl){
        render.bodyEl.style.margin = "0";
      }

      if(render.direction == "rtl" && render.docEl.dir != "rtl"){
        render.docEl.dir = "rtl";
        render.docEl.style.position = "absolute";
        render.docEl.style.right = "0";
      }
      deferred.resolve(render.docEl);
    };

    this.iframe.onerror = function(e){
      deferred.reject({
        message : "iframe加载时出错: " + e,
        stack: new Error().stack
      })
    };
    this.iframe.contentWindow.location.replace(url);
  }.bind(this));

  return deferred.promise;
};

/**
 * 重置iframe的高度与宽度
 * @param width
 * @param height
 */
EPUBJS.Render.Iframe.prototype.resize = function (width, height) {
  if (!this.iframe) return;
  this.iframe.height = height;

  if (!isNaN(width) && width % 2 !== 0) {
    width += 1;
  }

  this.iframe.width = width;

  this.width = this.iframe.getBoundingClientRect().width || width;
  this.height = this.iframe.getBoundingClientRect().height || height;
};

/**
 * 重置iframe的高度与宽度
 */
EPUBJS.Render.Iframe.prototype.resized = function(){
  this.width = this.iframe.getBoundingClientRect().width;
  this.height = this.iframe.getBoundingClientRect().height;
};

/**
 * 设置文档的行进方向
 * @param direction
 */
EPUBJS.Render.Iframe.prototype.setDirection = function (direction) {
  this.direction = direction;

  if(this.docEl && this.docEl.dir == "rtl"){
    this.docEl.dir = "rtl";
    this.docEl.style.position = "static";
    this.docEl.style.right = "auto";
  }
};

/**
 * 设置是否显示滚动条
 * @param bool
 */
EPUBJS.Render.Iframe.prototype.scroll = function(bool){
  if(bool){
    this.iframe.scrolling = "yes";
  }else{
    this.iframe.scrolling = "no";
  }
};

/**
 * 设置页面高度与宽度
 * @param pageWidth
 * @param pageHeight
 */
EPUBJS.Render.Iframe.prototype.setPageDimensions = function(pageWidth, pageHeight){
  this.pageWidth = pageWidth;
  this.pageHeight = pageHeight;
};

/**
 * 获取跟节点
 * @returns {null|*|EPUBJS.Render.Iframe.bodyEl}
 */
EPUBJS.Render.Iframe.prototype.getBaseElement = function(){
  return this.bodyEl;
};

/**
 * 获取document
 * @returns {null|*|EPUBJS.Render.Iframe.docEl}
 */
EPUBJS.Render.Iframe.prototype.getDocumentElement = function(){
  return this.docEl;
};

/**
 * 计算页面偏移量
 * @param pg
 */
EPUBJS.Render.Iframe.prototype.page = function(pg){
  this.leftPos = this.pageWidth * (pg - 1);
  if(this.direction === "rtl"){
    this.leftPos = this.leftPos * -1;
  }
  this.setLeft(this.leftPos);
};

/**
 * 设置页面的显示区域
 * @param leftPos
 */
EPUBJS.Render.Iframe.prototype.setLeft = function(leftPos){
  this.document.defaultView.scrollTo(leftPos, 0);
};

RSVP.EventTarget.mixin(EPUBJS.Render.Iframe.prototype);