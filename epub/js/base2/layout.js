/**
 * Created by wangwy on 15-9-8.
 */
EPUBJS.Layout = EPUBJS.Layout || {};
EPUBJS.Layout.Scroll = function(){

};

EPUBJS.Layout.Scroll.prototype.calculate = function(_width){
  this.spread = _width;
  this.column = _width;
  this.gap = 0;
};

EPUBJS.Layout.Scroll.prototype.format = function(view){
  var $doc = view.document.documentElement;
  $doc.style.width = "auto";
  $doc.style.height = "auto";
};