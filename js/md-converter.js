(function (extension, window) {
  if (typeof showdown !== 'undefined') {
    // global (browser or nodejs global)
    extension(showdown, window);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['showdown', 'window'], extension);
  } else if (typeof exports === 'object') {
    // Node, CommonJS-like
    module.exports = extension(require('showdown'), window);
  } else {
    // showdown was not found so we throw
    throw Error('Could not find showdown library');
  }
}(function (showdown, window) {
  const mdconverter = new showdown.Converter({
    tasklists: true,
    noHeaderId: true,
    parseImgDimensions: true,
    ghCodeBlocks: true,
    emoji: true,
    strikethrough: true,
    underline: true,
    tables: true,
    ghMentions: true,
    extensions: ["timeline", "highlightjs"]
  });

  // function .convertMarkdown for remarkjs-mod
  var element = document.createElement("div");
  mdconverter.convertMarkdown = function (content, links, inline) {
    element.innerHTML = convertMarkdown(content, links || {}, inline);
    element.innerHTML = element.innerHTML.replace(/<p>\s*<\/p>/g, '');
    return element.innerHTML.replace(/\n\r?$/, '');
  }

  function convertMarkdown (content, links, insideContentClass) {
    var i, tag, markdown = '', html, full;

    for (i = 0; i < content.length; ++i) {
      if (typeof content[i] === 'string') {
        markdown += content[i];
      }
      else {
        tag = content[i].block ? 'div' : 'span';
        markdown += '<' + tag + ' class="' + content[i].class + '">';
        markdown += convertMarkdown(content[i].content, links, !content[i].block);
        markdown += '</' + tag + '>';
      }
    }

    full = markdown + Object.keys(links).map(k => "\n[" + k + "]: " + links[k].href);
    html = mdconverter.makeHtml(full);

    if (insideContentClass) {
      element.innerHTML = html;
      if (element.children.length === 1 && element.children[0].tagName === 'P') {
        html = element.children[0].innerHTML;
      }
    }

    return html;
  }

  if(typeof(window.mdconverter) === 'undefined'){
    window.mdconverter = mdconverter;
  }
}, window));