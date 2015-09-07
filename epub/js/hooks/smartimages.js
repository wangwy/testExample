/**
 * Created by wangwy on 15-8-12.
 */
EPUBJS.Hooks.register("beforeChapterDisplay").smartimages = function(callback, renderer){
  var images = renderer.contents.querySelectorAll('img'),
      items = Array.prototype.slice.call(images),
      iheight = renderer.height;
  if(renderer.layoutSettings.layout != "reflowable"){
    callback();
    return;
  }

  items.forEach(function(item){

    function size(){
      var itemRect = item.getBoundingClientRect(),
          rectHeight = itemRect.height,
          top = itemRect.top,
          oHeight = item.getAttribute('data-height'),
          height = oHeight || rectHeight,
          newHeight,
          fontSize = Number(getComputedStyle(item,"").fontSize.match(/(\d*(\.\d*)?)px/)[1]),
          fontAdjust = fontSize ? fontSize / 2:0;
      iheight = renderer.contents.clientHeight;
      if(top < 0) top = 0;
      if(height + top >= iheight){
        if(top < iheight/2){
          newHeight = iheight - top - fontAdjust;
          item.style.maxHeight = newHeight + "px";
          item.style.width = "auto";
        }else{
          if(height > iheight){
            item.style.maxHeight = iheight + "px";
            item.style.width = "auto";
            itemRect = item.getBoundingClientRect();
            height = itemRect.height;
          }
          item.style.display = "block";
          item.style["WebkitColumnBreakBefore"] = "always";
          item.style["breakBefore"] = "column";
        }

        item.setAttribute('data-height',newHeight);
      }else{
        item.style.removeProperty('max-height');
        item.style.removeProperty('margin-top');
      }
    }

//    item.addEventListener('load',size,false);
    renderer.on("renderer:resized",size);
    renderer.on("renderer:chapterUnloaded",function(){
//      item.removeEventListener('load',size);
      renderer.off("renderer:resized",size);
    });
    size();
  });
  if(callback) callback();
};