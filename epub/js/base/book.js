/**
 * Created by wangwy on 15-8-28.
 */
EPUBJS.Book = function (options) {
  this.settings = _.defaults(options || {}, {
    bookPath: null,
    bookKey: null,
    packageUrl: null,
    storage: false,
    fromStorage: false,
    saved: false,
    online: true,
    contained: false,
    width: null,
    height: null,
    layoutOveride: null,
    orientation: null,
    minSpreadWidth: 800,
    gap: "auto",
    version: 1,
    restore: false,
    reload: false,
    goto: false,
    styles: {},
    headTags: {},
    withCredentials: false,
    render_method: "Iframe"
  });

  this.settings.EPUBJSVERSION = EPUBJS.VERSION;

  this.spinePos = 0;

  this.ready = {
    manifest: new RSVP.defer(),
    spine: new RSVP.defer(),
    metadata: new RSVP.defer(),
    cover: new RSVP.defer(),
    toc: new RSVP.defer()
  };

  this.readyPromises = [
    this.ready.manifest.promise,
    this.ready.spine.promise,
    this.ready.metadata.promise,
    this.ready.cover.promise,
    this.ready.toc.promise
  ];

  this.ready.all = RSVP.all(this.readyPromises);

  this.ready.all.then(this._ready.bind(this));

  this.renderer = new EPUBJS.Renderer(this.settings.render_method);

  this.renderer.setMinSpreadWidth(this.settings.minSpreadWidth);

  this.listenToRenderer(this.renderer);

  this.defer_opened = new RSVP.defer();
  this.opened = this.defer_opened.promise;

  if (typeof this.settings.bookPath === 'string') {
    this.open(this.settings.bookPath);
  }

  window.addEventListener("beforeunload", this.unload.bind(this), false);
};

/**
 * 根据电子书路径获取container.xml,并解析opf文件
 * @param bookPath
 * @returns {*}
 */
EPUBJS.Book.prototype.open = function (bookPath) {
  var book = this,
      epubpackage,
      opened = new RSVP.defer();
  this.settings.bookPath = bookPath;
  this.bookUrl = this.urlFrom(bookPath);

  epubpackage = this.loadPackage();

  epubpackage.then(function (packageXml) {
    book.unpack(packageXml);
    opened.resolve();
    book.defer_opened.resolve();
  });

  this._registerReplacements(this.renderer);

  return opened.promise;
};

/**
 * 下载container.xml并解析
 * @returns {*}
 */
EPUBJS.Book.prototype.loadPackage = function () {
  var book = this,
      parse = new EPUBJS.Parser(),
      containerPath = "META-INF/container.xml",
      packageXml;
  packageXml = book.loadXml(book.bookUrl + containerPath).
      then(function (containerXml) {
        return parse.container(containerXml);
      }).
      then(function (paths) {
        book.settings.contentsPath = book.bookUrl + paths.basePath;
        book.settings.packageUrl = book.bookUrl + paths.packagePath;
        book.settings.encoding = paths.encoding;
        return book.loadXml(book.settings.packageUrl);
      });
  return packageXml;
};

/**
 * 下载xml文件
 * @param url
 * @returns {*}
 */
EPUBJS.Book.prototype.loadXml = function (url) {
  return EPUBJS.core.request(url, 'xml', this.settings.withCredentials);
};

/**
 * 获取bookPath的绝对路径
 * @param bookPath
 * @returns {*}
 */
EPUBJS.Book.prototype.urlFrom = function (bookPath) {
  var uri = EPUBJS.core.uri(bookPath),
      absolute = uri.protocol,
      fromRoot = uri.path[0] == "/",
      location = window.location,
      origin = location.origin || location.protocol + "//" + location.host,
      baseTag = document.getElementsByTagName('base'),
      base;
  if (baseTag.length) {
    base = baseTag[0].href;
  }

  if (uri.protocol) {
    return uri.origin + uri.path;
  }

  if (!absolute && fromRoot) {
    return (base || origin) + uri.path;
  }

  if (!absolute && !fromRoot) {
    return EPUBJS.core.resolveUrl(base || location.pathname, uri.path);
  }
};

/**
 * 当电子书并解析完毕后触发的事件
 * @private
 */
EPUBJS.Book.prototype._ready = function () {
  this.trigger("book:ready");
};

/**
 * 添加渲染过程的所有事件
 * @param renderer
 */
EPUBJS.Book.prototype.listenToRenderer = function (renderer) {
  var book = this;

  renderer.Events.forEach(function (eventName) {
    renderer.on(eventName, function (e) {
      book.trigger(eventName, e);
    })
  })
};

/**
 * 解析opf文件与目录文件
 * @param packageXml
 */
EPUBJS.Book.prototype.unpack = function (packageXml) {
  var book = this,
      parse = new EPUBJS.Parser();
  book.contents = parse.packageContents(packageXml, book.settings.contentsPath);
  book.manifest = book.contents.manifest;
  book.spine = book.contents.spine;
  book.spineIndexByURL = book.contents.spineIndexByURL;
  book.metadata = book.contents.metadata;
  if (!book.settings.bookKey) {
    book.settings.bookKey = book.generateBookKey(book.metadata.identifier);
  }

  book.globalLayoutProperties = book.parseLayoutProperties(book.metadata);

  if (book.contents.coverPath) {
    book.cover = book.contents.cover = book.settings.contentsPath + book.contents.coverPath;
  }
  book.spineNodeIndex = book.contents.spineNodeIndex;
  book.ready.manifest.resolve(book.contents.manifest);
  book.ready.spine.resolve(book.contents.spine);
  book.ready.metadata.resolve(book.contents.metadata);
  book.ready.cover.resolve(book.contents.cover);

  if (book.contents.navPath) {
    book.settings.navUrl = book.settings.contentsPath + book.contents.navPath;

    book.loadXml(book.settings.navUrl).
        then(function (navHtml) {
          return parse.nav(navHtml, book.spineIndexByURL, book.spine);
        }).then(function (toc) {
          book.toc = book.contents.toc = toc;
          book.ready.toc.resolve(false);
        });
  } else if (book.contents.tocPath) {
    book.settings.tocUrl = book.settings.contentsPath + book.contents.tocPath;

    book.loadXml(book.settings.tocUrl).
        then(function (tocXml) {
          return parse.toc(tocXml, book.spineIndexByURL, book.spine);
        })
  }
};

/**
 * 页面加载时所触发的事件
 */
EPUBJS.Book.prototype.unload = function () {
  this.trigger("book:unload");
};

/**
 * 注册hooks函数
 * @param renderer
 * @private
 */
EPUBJS.Book.prototype._registerReplacements = function (renderer) {
  renderer.registerHook("beforeChapterDisplay", EPUBJS.replace.hrefs.bind(this), true);
};

/**
 * 获得书籍标识符
 * @param identifier
 * @returns {string}
 */
EPUBJS.Book.prototype.generateBookKey = function (identifier) {
  return "epubjs:" + EPUBJS.VERSION + ":" + window.location.host + ":" + identifier;
};

/**
 * 获得书籍的布局方式
 * @param metadata
 * @returns {{layout: (null|EPUBJS.Book.settings.layoutOveride|*|EPUBJS.Book.parseLayoutProperties.layout|metadata.layout|EPUBJS.Renderer.layout), spread: (null|EPUBJS.Book.settings.layoutOveride|*|EPUBJS.Book.parseLayoutProperties.spread|metadata.spread|string), orientation: (null|EPUBJS.Book.settings.layoutOveride|EPUBJS.Book.settings.orientation|EPUBJS.Book.parseLayoutProperties.orientation|metadata.orientation|*)}}
 */
EPUBJS.Book.prototype.parseLayoutProperties = function (metadata) {
  var layout = (this.layoutOveride && this.layoutOveride.layout) || metadata.layout || "reflowable";
  var spread = (this.layoutOveride && this.layoutOveride.spread) || metadata.spread || "auto";
  var orientation = (this.layoutOveride && this.layoutOveride.orientation) || metadata.orientation || "auto";
  return {
    layout: layout,
    spread: spread,
    orientation: orientation
  };
};

/**
 * 根据节点开始渲染页面
 * @param elem
 */
EPUBJS.Book.prototype.renderTo = function (elem) {
  var book = this,
      rendered;
  if (_.isElement(elem)) {
    this.element = elem;
  } else if (typeof elem == "string") {
    this.element = EPUBJS.core.getEl(elem);
  } else {
    console.error("Not an Element");
    return;
  }

  rendered = this.opened.
      then(function () {
        book.renderer.initialize(book.element, book.settings.width, book.settings.height);

        if (book.metadata.direction) {
          book.renderer.setDirection(book.metadata.direction);
        }

        book._rendered();

        return book.startDisplay();
      })
};

/**
 * 开始显示
 * @returns {*}
 */
EPUBJS.Book.prototype.startDisplay = function () {
  var display;

  if (this.settings.goto) {

  } else if (this.settings.previousLocationCfi) {

  } else {
    display = this.displayChapter(this.spinePos);
  }

  return display;
};

/**
 * 展示章节
 * @param chap
 * @param end
 * @param deferred
 * @returns {deferred.promise|*}
 */
EPUBJS.Book.prototype.displayChapter = function (chap, end, deferred) {
  var book = this,
      render,
      pos,
      defer = deferred || new RSVP.defer();
  var chapter;

  if (_.isNumber(chap)) {
    pos = chap;
  } else {

  }

  if (pos < 0 || pos >= this.spine.length) {
    console.warn("不是一个有效的页码");
    pos = 0;
    end = false;
  }

  chapter = new EPUBJS.Chapter(this.spine[pos]);

  this._rendering = true;

  render = book.renderer.displayChapter(chapter, this.globalLayoutProperties);

  render.then(function(){

    if(end){
      book.renderer.lastPage();
    }

    book.spinePos = pos;
    defer.resolve(book.renderer);

    if(!book.settings.fromStorage && !book.settings.contained){
      book.preloadNextChapter();
    }

    book.currentChapter = chapter;
  },function(error){
    console.log("无法下载章节: " + chapter.absolute);
    defer.reject(error);
  });

  return defer.promise;
};

/**
 * 渲染完成触发的事件
 * @private
 */
EPUBJS.Book.prototype._rendered = function () {
  this.isRendered = true;
  this.trigger("book:rendered");
};

/**
 * 下一页
 * @returns {*}
 */
EPUBJS.Book.prototype.nextPage = function () {
  var next = this.renderer.nextPage();
  if (!next) {
    return this.nextChapter();
  }
};

/**
 * 上一页
 * @returns {*}
 */
EPUBJS.Book.prototype.prevPage = function(){
  var prev = this.renderer.prevPage();
  if(!prev){
    return this.prevChapter();
  }
};

/**
 * 下一章节
 * @returns {*}
 */
EPUBJS.Book.prototype.nextChapter = function () {
  var next;
  if (this.spinePos < this.spine.length - 1) {
    next = this.spinePos + 1;
    while (this.spine[next] && this.spine[next].linear && this.spine[next].linear == 'no') {
      next++
    }
    if (next < this.spine.length) {
      return this.displayChapter(next);
    } else {
      this.trigger("book:atEnd");
    }
  } else {
    this.trigger("book:atEnd");
  }
};

EPUBJS.Book.prototype.prevChapter = function(){
  var prev;
  if(this.spinePos > 0){
    prev = this.spinePos - 1;
    while(this.spine[prev] && this.spine[prev].linear && this.spine[prev].linear == 'no'){
      prev--;
    }

    if(prev >= 0){
      return this.displayChapter(prev, true);
    }else{
      this.trigger("book:atStart");
    }
  }else{
    this.trigger("book:atStart");
  }
};

/**
 * 预先加载下一章节
 * @returns {boolean}
 */
EPUBJS.Book.prototype.preloadNextChapter = function(){
  var next;
  var chap = this.spinePos + 1;
  if(chap >= this.spine.length){
    return false;
  }
  next = new EPUBJS.Chapter(this.spine[chap]);

  if(next){
    EPUBJS.core.request(next.absolute);
  }
};

/**
 * 页面跳转
 * @param target
 * @returns {*}
 */
EPUBJS.Book.prototype.goto = function(target){
  return this.gotoHref(target);
};

/**
 * 根据<a>跳转
 * @param url
 * @param defer
 * @returns {*}
 */
EPUBJS.Book.prototype.gotoHref = function(url, defer){
  var split, chapter, section, relativeURL, spinePos;
  var deferred = defer || new RSVP.defer();

  if(!this.isRendered){
    this.settings.goto = url;
    return false;
  }

  split = url.split("#");
  chapter = split[0];
  relativeURL = chapter.replace(this.settings.contentsPath, '');
  spinePos = this.spineIndexByURL[relativeURL];

  if(!chapter){
    spinePos = this.currentChapter ? this.currentChapter.spinePos : 0;
  }

  if(typeof(spinePos) != "number") return false;

  if(!this.currentChapter || spinePos != this.currentChapter.spinePos){
    return this.displayChapter(spinePos)
  }else{
    this.renderer.firstPage();
  }

  return deferred.promise;
};
RSVP.EventTarget.mixin(EPUBJS.Book.prototype);