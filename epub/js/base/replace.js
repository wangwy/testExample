/**
 * Created by wangwy on 15-8-28.
 */
EPUBJS.replace = {};

/**
 * 替换所有的链接
 * @param callback
 * @param renderer
 */
EPUBJS.replace.hrefs = function (callback, renderer) {
  var book = this;
  var replacments = function (link, done) {
    var href = link.getAttribute("href"),
        isRelative = href.search("://"),
        directory,
        relative;
    if (isRelative != -1) {
      link.setAttribute("target", "_blank");
    } else {
      var uri = EPUBJS.core.uri(renderer.render.window.location.href);
      directory = uri.directory;
      if (directory) {
        if (uri.protocol === "file") {
          relative = EPUBJS.core.resolveUrl(uri.base, href);
        } else {
          relative = EPUBJS.core.resolveUrl(directory, href);
        }
      } else {
        relative = href;
      }
      link.onclick = function () {
        book.goto(relative);
        return false;
      };
    }
    done();
  };

  renderer.replace("a[href]", replacments, callback);
};

/**
 * 替换图片的链接
 * @param renderer
 */
EPUBJS.replace.imgSrc = function (renderer) {
  var replacments = function (link, done) {
    var src = link.getAttribute("src"),
        isRelative = src.search("://"),
        directory,
        relative;
    if (isRelative == -1) {
      var uri = EPUBJS.core.uri(renderer.render.window.location.href);
      directory = uri.directory;
      if (directory) {
        if (uri.protocol === "file") {
          relative = EPUBJS.core.resolveUrl(uri.base, src);
        } else {
          relative = EPUBJS.core.resolveUrl(directory, src);
        }
      } else {
        relative = href;
      }
      link.setAttribute("src", relative);
    }
    done();
  };

  renderer.replace("img[src]",replacments,function(){});
};