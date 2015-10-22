/**
 * Created by wangwy on 15-9-16.
 */
function EpubJs(){};
EpubJs.prototype = {
  generateCfiFromRange: function(range){
    var start, startElement, startSteps, startPath, startOffset, startIndex;
    var end, endElement, endSteps, endPath, endOffset, endIndex;

    start = range.startContainer;

    if(start.nodeType === 3) { // text node
      startElement = start.parentNode;
      startIndex = 1 + (2 * this.indexOfTextNode(start));
      startSteps = this.pathTo(startElement);
    } else if(range.collapsed) {
      return this.generateCfiFromElement(start); // single element
    } else {
      startSteps = this.pathTo(start);
    }

    startPath = this.generatePathComponent(startSteps);
    startOffset = range.startOffset;

    if(!range.collapsed) {
      end = range.endContainer;

      if(end.nodeType === 3) { // text node
        endElement = end.parentNode;
        // endIndex = 1 + (2 * Array.prototype.indexOf.call(endElement.childNodes, end));
        endIndex = 1 + (2 * this.indexOfTextNode(end));

        endSteps = this.pathTo(endElement);
      } else {
        endSteps = this.pathTo(end);
      }

      endPath = this.generatePathComponent(endSteps);
      endOffset = range.endOffset;

      return "epubcfi(" + startPath + "/" + startIndex + ":" + startOffset + "," + endPath + "/" + endIndex + ":" + endOffset + ")";

    } else {
      return "epubcfi(" + startPath + "/"+ startIndex +":"+ startOffset +")";
    }
  },
  generateCfiFromElement: function(element) {
    var steps = this.pathTo(element);
    var path = this.generatePathComponent(steps);
    if(!path.length) {
      // Start of Chapter
      return "epubcfi(!/4/)";
    } else {
      var offset = "";
      var embeddedElements = ["audio", "canvas", "embed", "iframe", "img", "math", "object", "svg", "video"];
      if (embeddedElements.indexOf(element.tagName.toLowerCase()) === -1) {
        // if the element could contain text, set the character offset;
        offset += "/1:0";
      }
      // First Text Node
      return "epubcfi(" + path + offset + ")";
    }
  },
  pathTo: function(node) {
    var stack = [],
        children;

    while(node && node.parentNode !== null && node.parentNode.nodeType != 9) {
      children = node.parentNode.children;

      stack.unshift({
        'id' : node.id,
        // 'classList' : node.classList,
        'tagName' : node.tagName,
        'index' : children ? Array.prototype.indexOf.call(children, node) : 0
      });

      node = node.parentNode;
    }

    return stack;
  },
  generatePathComponent: function(steps) {
    var parts = [];

    steps.forEach(function(part){
      var segment = '';
      segment += (part.index + 1) * 2;

      if(part.id) {
        segment += "[" + part.id + "]";
      }

      parts.push(segment);
    });

    return parts.join('/');
  },
  indexOfTextNode: function(textNode){
    var parent = textNode.parentNode;
    var children = parent.childNodes;
    var sib;
    var index = -1;
    for (var i = 0; i < children.length; i++) {
      sib = children[i];
      if(sib.nodeType === Node.TEXT_NODE){
        index++;
      }
      if(sib == textNode) break;
    }

    return index;
  }
};

var EpubJs = new EpubJs();