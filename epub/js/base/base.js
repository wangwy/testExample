/**
 * Created by wangwy on 15-8-28.
 */
'use strict';

var EPUBJS = EPUBJS || {};
EPUBJS.VERSION = "0.2.7";
EPUBJS.plugins = EPUBJS.plugins || {};
EPUBJS.filePath = EPUBJS.filePath || "/epubjs/";
EPUBJS.Render = {};
RSVP.on('error', function (reason) {
  console.log(reason);
});
(function(root){

  var ePub = root.ePub = function(){
    var bookPath, options;
    if(typeof(arguments[0]) != 'undefined' && typeof arguments[0] === 'string'){
      bookPath = arguments[0];

      if(arguments[1] && typeof arguments[1] === 'object'){
        options = arguments[1];
        options.bookPath = bookPath;
      }else{
        options = {'bookPath' : bookPath};
      }
    }

    if(arguments[0] && typeof arguments[0] === 'object'){
      options = arguments[0]
    }

    return new EPUBJS.Book(options);
  }

})(window);
