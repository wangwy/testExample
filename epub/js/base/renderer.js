/**
 * Created by wangwy on 15-8-28.
 */
EPUBJS.Renderer = function (renderMethod, hidden) {
  if (renderMethod && typeof(EPUBJS.Render[renderMethod]) != "undefined") {
    this.render = new EPUBJS.Render[renderMethod]();
  } else {
    console.error("Not a Valid Rendering Method");
  }

  this.render.on("render:loaded", this.loaded.bind(this));

  this.resized = _.debounce(this.onResized.bind(this), 100);

  this.layoutSettings = {};

  this.hidden = hidden || false;

  EPUBJS.Hooks.mixin(this);

  this.getHooks("beforeChapterDisplay");
};

/**
 * 渲染事件
 * @type {string[]}
 */
EPUBJS.Renderer.prototype.Events = [
  "renderer:keydown",
  "renderer:keyup",
  "renderer:keypressed",
  "renderer:mouseup",
  "renderer:mousedown",
  "renderer:click",
  "renderer:touchstart",
  "renderer:touchend",
  "renderer:selected",
  "renderer:chapterUnloaded",
  "renderer:chapterDisplayed",
  "renderer:locationChanged",
  "renderer:visibleLocationChanged",
  "renderer:resized",
  "renderer:spreads"
];

/**
 * 渲染过程初始化
 * @param element
 * @param width
 * @param height
 */
EPUBJS.Renderer.prototype.initialize = function (element, width, height) {
  this.container = element;
  this.element = this.render.createIframe();

  this.initWidth = width;
  this.initHeight = height;

  this.width = width || this.container.clientWidth;
  this.height = height || this.container.clientHeight;

  this.container.appendChild(this.element);

  if (width && height) {
    this.render.resize(this.width, this.height);
  } else {
    this.render.resize('100%', '100%');
  }

  //方向改变时触发的事件
  document.addEventListener("orientationchange", this.onResized);
};

/**
 * 设置宽度
 * @param width
 */
EPUBJS.Renderer.prototype.setMinSpreadWidth = function (width) {
  this.minSpreadWidth = width;
  this.spreads = this.determineSpreads(width);
};

/**
 * 判断是单页还是双页
 * @param cutoff
 * @returns {boolean}
 */
EPUBJS.Renderer.prototype.determineSpreads = function (cutoff) {
  if (this.isForcedSingle || !cutoff || this.width < cutoff) {
    return false; //单页面
  } else {
    return true;  //双页面
  }
};

/**
 * 页面下载所触发的事件
 * @param url
 */
EPUBJS.Renderer.prototype.loaded = function (url) {
  this.trigger("render:loaded", url);
};

/**
 * 替代函数
 * @param query
 * @param func
 * @param finished
 * @param progress
 */
EPUBJS.Renderer.prototype.replace = function (query, func, finished, progress) {
  var items = this.contents.querySelectorAll(query),
      resources = Array.prototype.slice.call(items),
      count = resources.length;

  if (count === 0) {
    finished(false);
    return;
  }

  resources.forEach(function (item) {
    var called = false;
    var after = function (result, full) {
      if (called === false) {
        count--;
        if (progress) progress(result, full, count);
        if (count <= 0 && finished) finished(true);
        called = true;
      }
    };

    func(item, after);
  }.bind(this));
};

/**
 * 当方向改变时触发的事件
 */
EPUBJS.Renderer.prototype.onResized = function () {
  var width = this.container.clientWidth;
  var height = this.container.clientHeight;

  this.resize(width, height, false);
};

/**
 * 重置区域的高度与宽度
 * @param width
 * @param height
 * @param setSize
 */
EPUBJS.Renderer.prototype.resize = function (width, height, setSize) {
  this.width = width;
  this.height = height;

  if (setSize !== false) {
    this.render.resize(this.width, this.height);
  }

  if (this.contents) {
    this.reformat();
  }

  this.trigger("renderer:resized", {
    width: this.width,
    height: this.height
  });
};

/**
 * 设置页面行进方向left-to-right 或者 right-to-left
 * @param direction
 */
EPUBJS.Renderer.prototype.setDirection = function (direction) {
  this.direction = direction;
  this.render.setDirection(this.direction);
};

/**
 * 展示页面
 * @param chapter
 * @param globalLayout
 * @returns {*|Promise}
 */
EPUBJS.Renderer.prototype.displayChapter = function (chapter, globalLayout) {
  return chapter.url().
      then(function () {
        this.currentChapter = chapter;
        this.chapterPos = 1;
        this.layoutSettings = this.reconcileLayoutSettings(globalLayout, chapter.properties);
        return this.load(chapter);
      }.bind(this));
};

/**
 * 调和电子书的布局方式
 * @param global
 * @param properties
 * @returns {{}}
 */
EPUBJS.Renderer.prototype.reconcileLayoutSettings = function (global, properties) {
  var settings = {};

  for (var attr in global) {
    if (global.hasOwnProperty(attr)) {
      settings[attr] = global[attr];
    }
  }

  properties.forEach(function (prop) {
    var rendition = prop.replace("rendition:", '');
    var split = rendition.indexOf("-");
    var property, value;

    if (split != -1) {
      property = rendition.slice(0, split);
      value = rendition.slice(split + 1);

      settings[property] = value;
    }
  });

  return settings;
};

/**
 * 加载页面
 * @param chapter
 * @returns {*}
 */
EPUBJS.Renderer.prototype.load = function (chapter) {
  var deferred = new RSVP.defer();

  this.layoutMethod = this.determineLayout(this.layoutSettings);
  this.layout = new EPUBJS.Layout[this.layoutMethod]();

  this.visible(false); //隐藏页面

  var render = this.render.load(chapter);

  render.then(function (contents) {
    this.currentChapter.setDocument(this.render.document);
    this.contents = contents;
    this.doc = this.render.document;

    EPUBJS.replace.imgSrc(this);
    this.formated = this.layout.format(contents, this.render.width, this.render.height);
    this.render.setPageDimensions(this.formated.pageWidth, this.formated.pageHeight);
    if (!this.initWidth && !this.initHeight) {
      this.render.window.addEventListener("resize", this.resized, false);
    }
    this.beforeDisplay(function () {
      var msg = this.currentChapter;
      this.updatePages();
      this.visible(true);
      deferred.resolve(this);
    }.bind(this));
  }.bind(this));

  return deferred.promise;
};

/**
 * 重新更新页面
 */
EPUBJS.Renderer.prototype.reformat = function(){
  var renderer = this;
  if(!this.contents) return;
  var spreads = this.determineSpreads(this.minSpreadWidth);

  if(spreads != this.spreads){
    this.spreads = spreads;
    this.layoutMethod = this.determineLayout(this.layoutSettings);
    this.layout = new EPUBJS.Layout[this.layoutMethod]();
  }
  this.chapterPos = 1;

  this.render.page(this.chapterPos);

  renderer.formated = renderer.layout.format(renderer.contents, renderer.render.width, renderer.render.height);
  renderer.render.setPageDimensions(renderer.formated.pageWidth, renderer.formated.pageHeight);

  renderer.updatePages();

};

/**
 * 判断显示页数，单页、双页、多页
 * @param settings
 * @returns {string}
 */
EPUBJS.Renderer.prototype.determineLayout = function (settings) {
  var spreads = this.determineSpreads(this.minSpreadWidth);
  var layoutMethod = spreads ? "ReflowableSpreads" : "Reflowable"; //Reflowable: 单页， ReflowableSpreads: 双页
  var scroll = false;

  if (settings.layout === "pre-paginated") { //指定页数
    layoutMethod = "Fixed";
    scroll = true;
    spreads = false;
  }

  if (settings.layout === "reflowable" && settings.spread === "none") {
    layoutMethod = "Reflowable";
    scroll = false;
    spreads = false;
  }

  if (settings.layout === "reflowable" && settings.spread === "both") {
    layoutMethod = "ReflowableSpreads";
    scroll = false;
    spreads = true;
  }

  this.spreads = spreads;
  this.render.scroll(scroll);
  this.trigger("renderer:spreads", spreads);

  return layoutMethod;
};

/**
 * 页面显示或者隐藏
 * @param bool
 * @returns {CSSStyleDeclaration.visibility|*}
 */
EPUBJS.Renderer.prototype.visible = function (bool) {
  if (typeof(bool) === "undefined") {
    return this.element.style.visibility;
  }

  if (bool === true && !this.hidden) {
    this.element.style.visibility = "visible";
  } else if (bool === false) {
    this.element.style.visibility = "hidden";
  }
};

/**
 * 在展示之前触发hooks钩子
 * @param callback
 */
EPUBJS.Renderer.prototype.beforeDisplay = function (callback) {
  this.triggerHooks("beforeChapterDisplay", callback, this);
};

/**
 * 更新页面
 */
EPUBJS.Renderer.prototype.updatePages = function () {
  this.pageMap = this.mapPage();

  if(this.spreads){
    this.displayedPages = Math.ceil(this.pageMap.length / 2);
  } else {
    this.displayedPages = this.pageMap.length;
  }

  this.currentChapter.pages = this.pageMap.length;
};

/**
 * 计算每一章的页数
 * @returns {Array}
 */
EPUBJS.Renderer.prototype.mapPage = function () {
  var renderer = this;
  var map = [];
  var root = this.render.getBaseElement();
  var page = 1;
  var width = this.layout.colWidth;
  var offset = this.formated.pageWidth * (this.chapterPos - 1);
  var limit = (width * page) - offset;
  var elLimit = 0;
  var prevRange;

  var check = function (node) {
    var elPos;
    var elRange;
    var children = Array.prototype.slice.call(node.childNodes);
    if (node.nodeType == Node.ELEMENT_NODE) {
      elRange = document.createRange();
      elRange.selectNodeContents(node);
      elPos = elRange.getBoundingClientRect();
      if (!elPos || (elPos.width === 0 && elPos.height === 0)) {
        return;
      }

      if (elPos.left > elLimit) {
        children.forEach(function (node) {
          if (node.nodeType == Node.TEXT_NODE &&
              node.textContent.trim().length) {
            checkText(node);
          }
        })
      }
    }
  };

  var checkText = function (node) {
    var ranges = renderer.splitTextNodeIntoWordsRanges(node);
    ranges.forEach(function(range){
      var pos = range.getBoundingClientRect();

      if(!pos || (pos.width === 0 && pos.height === 0)){
        return;
      }
      if(pos.left + pos.width < limit){
        if(!map[page - 1]){
          range.collapse(true);
          map.push({start:"start", end: null});
        }
      } else {
        if(prevRange){
          prevRange.collapse(true);
          map[map.length - 1].end = "end";
        }

        range.collapse(true);
        map.push({
          start: "start",
          end: null
        });

        page += 1;
        limit = (width * page) - offset;
        elLimit = limit - width;
      }

      prevRange = range;
    });
  };

  var docEl = this.render.getDocumentElement();
  var dir = docEl.dir;

  if(dir == "rtl"){
    docEl.dir = "ltr";
    docEl.style.position = "static";
  }

  this.sprint(root, check);

  if(dir == "rtl"){
    docEl.dir = dir;
    docEl.style.left = "auto";
    docEl.style.right = "0";
  }

  if(prevRange){
    prevRange.collapse(true);
    map[map.length - 1].end = "end";
  }

  if(!map.length){
    var range = this.doc.createRange();
    range.selectNodeContents(root);
    range.collapse(true);
    map.push({start: "start", end: "end"});
    range = null;
  }
  prevRange = null;
  root = null;
  return map;
};

/**
 * 获取字符串的rang区域
 * @param node
 * @returns {*}
 */
EPUBJS.Renderer.prototype.splitTextNodeIntoWordsRanges = function (node) {
  var ranges = [];
  var text = node.textContent.trim();
  var range;
  var pos = this.indexOfBreakableChar(text);

  if(pos === -1){
    range = this.doc.createRange();
    range.selectNodeContents(node);
    return [range];
  }

  range = this.doc.createRange();
  range.setStart(node, 0);
  range.setEnd(node, pos);
  ranges.push(range);

  range = this.doc.createRange();
  range.setStart(node, pos+1);

  while(pos != -1){
    pos = this.indexOfBreakableChar(text, pos+1);
    if(pos > 0){
      if(range){
        range.setEnd(node, pos);
        ranges.push(range);
      }

      range = this.doc.createRange();
      range.setStart(node, pos+1);
    }
  }

  if(range){
    range.setEnd(node, text.length);
    ranges.push(range);
  }

  return ranges;
};

/**
 * 判断字符串是否换行
 * @param text
 * @param startPosition
 * @returns {*}
 */
EPUBJS.Renderer.prototype.indexOfBreakableChar = function (text, startPosition) {
  var whiteCharacters = "\x2D\x20\t\r\n\b\f";
  if(!startPosition){
    startPosition = 0;
  }
  for(var i = startPosition; i < text.length; i++){
    if(whiteCharacters.indexOf(text.charAt(i)) != -1){
      return i;
    }
  }
  return -1;
};

/**
 * 循环页面内的节点
 * @param root
 * @param func
 */
EPUBJS.Renderer.prototype.sprint = function(root, func){
  var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
  var node;
  while((node = treeWalker.nextNode())){
    func(node);
  }
};

/**
 * 下一页
 * @returns {*}
 */
EPUBJS.Renderer.prototype.nextPage = function(){
  return this.page(this.chapterPos + 1);
};

/**
 * 上一页
 * @returns {boolean|*}
 */
EPUBJS.Renderer.prototype.prevPage = function(){
  return this.page(this.chapterPos - 1);
};

/**
 * 章节最后一页
 * @returns {boolean|*}
 */
EPUBJS.Renderer.prototype.lastPage = function(){
  return this.page(this.displayedPages);
};

/**
 * 根据页码显示
 * @param pg
 * @returns {boolean}
 */
EPUBJS.Renderer.prototype.page = function(pg){
  if(pg >= 1 && pg <= this.displayedPages){
    this.chapterPos = pg;
    this.render.page(pg);
    return true;
  }
  return false;
};

RSVP.EventTarget.mixin(EPUBJS.Renderer.prototype);