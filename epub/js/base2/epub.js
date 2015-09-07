/**
 * Created by wangwy on 15-9-7.
 */
var EPUBJS = EPUBJS || {};

EPUBJS.VERSION = "0.3.0";
RSVP.on('error', function (reason) {
  console.log(reason);
});
(function(root){
  var ePub = root.ePub = function(_url){
    return new EPUBJS.Book(_url);
  }
})(window);