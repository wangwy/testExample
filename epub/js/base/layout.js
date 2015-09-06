/**
 * Created by wangwy on 15-9-1.
 */
EPUBJS.Layout = EPUBJS.Layout || {};

EPUBJS.Layout.Reflowable = function(){
  this.documentElement = null;
  this.spreadWidth = null;
};

EPUBJS.Layout.Reflowable.prototype.format = function(documentElement, _width, _height){
  var width = Math.floor(_width);
  var section = Math.floor(width/8);
  var gap = (section % 2 === 0) ? section : section -1;
  this.documentElement = documentElement;
  this.spreadWidth = width;


  documentElement.style.overflow = "hidden";

  documentElement.style.width = width*2 + "px";

  documentElement.style.height = _height + "px";

  documentElement.style.display = "block";

  $(documentElement.getElementsByClassName('column')).children().unwrap();
  $(documentElement.getElementsByTagName('body')).columnize({width: width,height:_height,doneFunc:function(){
    $(documentElement.querySelectorAll('.column > *')).css({marginLeft:gap/2,marginRight:gap/2})
  }});
  this.colWidth = width;
  this.gap = gap;

  return {
    pageWidth : this.spreadWidth,
    pageHeight : _height
  };
};
