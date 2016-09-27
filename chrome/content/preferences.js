const SCREENSHOT_SIZE = 400;
const THEME_BASE_URL = "chrome://fastdial-profile/content/themes/current/";
var wnd = fastdial.Utils.getBrowserWindow();
var content = wnd.content.wrappedJSObject;
var images = {};

function initialize() {
    fastdial.Dom.get("folder").value = fastdial.Bookmark.getHome().title;
    initOptions();
    fastdial.Dom.get("search").value =
            fastdial.Prefs.getObject("search").length || 0;
    initThemes();
    initStyle();
    initColorPickers();
}

function defaults() {
    setShortcutKey("");
    fastdial.Prefs.clear("options");
    fastdial.Prefs.clear("search");
    fastdial.Prefs.clear("enable");
    fastdial.Theme.remove("current");
    wnd.fastdial.Overlay.updateView();
    setTimeout(initialize, 100);
}

function initOptions() {
    var options = fastdial.Prefs.getObject("options");
    fastdial.Dom.get("width").value = options.width;
    fastdial.Dom.get("height").value = options.height;
    fastdial.Dom.get("thumbWidth").value = options.thumbWidth;
    fastdial.Dom.get("fixed").checked = options.fixed;
    updateThumbHeight();
    fastdial.Dom.get("hideEmpty").checked = options.hideEmpty;
    fastdial.Dom.get("hideBack").checked = options.hideBack;
    fastdial.Utils.selectItem("openIn", options.openIn);
    fastdial.Dom.get("shortcutKey").value = options.shortcutKey || "";
    fastdial.Utils.selectItem("timeout", options.timeout);
    fastdial.Utils.selectItem("askFolder", options.askFolder);
    fastdial.Dom.get("enable").checked = fastdial.Prefs.getBool("enable");
}

function saveOptions() {
    var options = {};
    options.width = fastdial.Dom.get("width").value;
    options.height = fastdial.Dom.get("height").value;
    options.thumbWidth = fastdial.Dom.get("thumbWidth").value;
    options.fixed = fastdial.Dom.get("fixed").checked;
    options.hideEmpty = fastdial.Dom.get("hideEmpty").checked;
    options.hideBack = fastdial.Dom.get("hideBack").checked;
    options.openIn = fastdial.Dom.get("openIn").value;
    options.shortcutKey = fastdial.Dom.get("shortcutKey").value;
    options.timeout = fastdial.Dom.get("timeout").value;
    options.askFolder = fastdial.Dom.get("askFolder").value;
    fastdial.Prefs.setObject("options", options);
    wnd.fastdial.Overlay.updateView();
}

function updateThumbHeight() {
    var width = fastdial.Dom.get("thumbWidth").value;
    fastdial.Dom.get("thumbHeight").value = fastdial.Thumbnail.getHeight(width);
}

function saveSearch() {
    var oldSearch = fastdial.Prefs.getObject("search");
    var count = fastdial.Dom.get("search").value;
    var search = [];
    var defaultEngine = fastdial.Utils.getSearchEngine();
    for (var i = 0; i < count; i++) {
        search[i] = oldSearch[i] || defaultEngine.name;
    }
    fastdial.Prefs.setObject("search", search);
    wnd.fastdial.Overlay.updateView();
}

function setShortcutKey(key) {
    fastdial.Dom.get("shortcutKey").value = key || "";
    fastdial.Dom.get("restartIsNeeded").style.visibility = key ? "visible" : "hidden";
}

function onShortcutKey(e) {
    if (e.keyCode != e.DOM_VK_TAB) {
        setShortcutKey(fastdial.Utils.getShortcutKey(e));
        e.preventDefault();
        saveOptions();
    }
}

function initThemes() {
    var current = fastdial.Prefs.getString("theme");
    var tree = fastdial.Dom.get("themes");
    tree.addEventListener("keypress", onTreeKey, false);
    tree.removeEventListener("select", onThemeSelect, false);

    tree.currentIndex = -1;
    var children = tree.lastChild;
    fastdial.Dom.clear(children);
    var infos = fastdial.Theme.getInfos();
    infos.unshift({});
    var index = 0;
    for (var i in infos) {
        var name = infos[i].name || "";
        var cell = document.createElement("treecell");
        cell.setAttribute("value", name);
        var title = infos[i].title || "";
        if (!title || title == "*") {
            title += fastdial.Bundle.getString("defaultTheme");
        }
        cell.setAttribute("label", title);
        var item = document.createElement("treeitem");
        var row = document.createElement("treerow");
        row.appendChild(cell);
        item.appendChild(row);
        children.appendChild(item);
        if (name == (current || "")) {
            tree.view.selection.select(index);
        }
        index++;
    }
    tree.addEventListener("select", onThemeSelect, false);
    updateThemeButtons();
}

function onTreeKey(e) {
   if (e.keyCode == e.DOM_VK_DELETE && getTheme()) {
       removeThemes();
   }
}

function updateThemeButtons() {
    fastdial.Dom.get("rename").disabled = !getTheme();
    var removable = false;
    for (var i in getThemes()) removable |= i != 0;
    fastdial.Dom.get("remove").disabled = !removable;
}

function getTheme() {
    var tree = fastdial.Dom.get("themes");
    if (tree.currentIndex != -1) {
        var column = tree.columns.getFirstColumn();
        return tree.view.getCellValue(tree.currentIndex, column);
    }
}

function getThemes() {
    var themes = {};
    var tree = fastdial.Dom.get("themes");
    var start = new Object();
    var end = new Object();
    var column = tree.columns.getFirstColumn();
    var rangeCount = tree.view.selection.getRangeCount();
    for (var i = 0; i < rangeCount; i++) {
        tree.view.selection.getRangeAt(i, start, end);
        for (var j = start.value; j <= end.value; j++)
            themes[j] = tree.view.getCellValue(j, column);
    }
    return themes;
}

function onThemeSelect() {
    var theme = fastdial.Prefs.getString("theme");
    if (/^~/.test(theme)) {
        fastdial.Theme.copy("current", theme);
    }
    var newTheme = getTheme();
    fastdial.Prefs.setString("theme", newTheme);
    fastdial.Theme.copy(newTheme, "current");
    updateThemeButtons();
    reloadView();
    setTimeout(initStyle, 100);
}

function importThemes() {
    var files = fastdial.File.chooseFile("multiple", ["*.zip"]);
    if (!files) return;

    for (var i in files) {
        fastdial.Theme.import(files[i]);
    }
    initThemes();
    onThemeSelect();
}

function exportTheme() {
    var file = fastdial.File.chooseFile("save", ["*.zip"]);
    if (!file) return;
    if (!file.leafName.match(/\.zip$/)) {
        file.leafName += ".zip";
    }
    var theme = fastdial.Prefs.getString("theme");
    var title = fastdial.Theme.getTitle(theme);
    fastdial.Theme.setStyle(getStyle(title));

    fastdial.File.zip(file, 
           fastdial.Theme.getDirectory("current"));
    var snapshot = file.clone();
    snapshot.leafName = snapshot.leafName.replace(/\.zip$/, ".png");
    wnd.fastdial.Snapshot.createScreenshot(fastdial.Info.URI, snapshot);
}

function renameTheme() {
    var name = getTheme();
    var title = {
        value: fastdial.Theme.getTitle(name)
    }
    var message = fastdial.Bundle.getString("title");
    var proceed = fastdial.Utils.prompt(message, title);
    if (proceed && title.value) {
        fastdial.Theme.remove(name);
        fastdial.Theme.setStyle(getStyle(title.value));
        var newName = "user" + new Date().getTime();
        fastdial.Theme.copy("current", newName);
        fastdial.Prefs.setString("theme", newName);
        initThemes();
    }
}

function removeThemes() {
    var message = fastdial.Bundle.getString("removeThemes");
    if (!fastdial.Utils.confirm(message)) return;
    var themes = getThemes();
    for (var i in themes) {
        fastdial.Theme.remove(themes[i]);
    }
    fastdial.Prefs.clear("theme");
    initThemes();
    onThemeSelect();
}

function initStyle() {
    if (!content.initThumbnails) {
        return wnd.fastdial.Loader.load(fastdial.Info.URI, function(browser) {
            content = browser.contentWindow.wrappedJSObject;
            initStyle();
            browser.close();
        });
    }
    initPageStyle();
    initSearchStyle();
    initThumbnailStyle();
}

function initPageStyle() {
    initFontFamily("font-family");
    initFontFamily("search.font-family");
    var doc = content.document;
    fastdial.Dom.get("page").value = images["page"] = getImageURL(doc.body);
    var repeat = fastdial.Dom.css(doc.body, "background-repeat");
    fastdial.Dom.get("center").checked = repeat != "repeat";
    var back = doc.createElement("div");
    fastdial.Dom.addClass(back, "back");
    fastdial.Dom.get("back").value = images["back"] = getImageURL(back);
    var fontFamily = fastdial.Dom.css(doc.body, "font-family");
    fastdial.Utils.selectItem("font-family", fontFamily.match(/[^'"]+/));
    var fontSize = fastdial.Dom.css(doc.body, "font-size");
    fastdial.Dom.get("font-size").value = parseInt(fontSize);
    var background = fastdial.Dom.css(doc.body, "background-color");
    setColor("background", background);
}

function getImageURLs(element) {
    var result = [];
    var image = fastdial.Dom.css(element, "background-image");
    var urls = image.split(/[, ]/);

    for (var i = 0; i < urls.length; i++) {
        var url = urls[i].match(/url\(\"(.*)\"\)/i);
        if (url) {
           url = url[1].replace(THEME_BASE_URL, "");
           result.push(url);
        }
    }
    return result;
}

function getImageURL(element) {
    var urls = getImageURLs(element);
    return urls.length ? urls[0] : "";
}

function initFontFamily(name) {
    var menupopup = fastdial.Dom.get(name).menupopup;
    fastdial.Dom.clear(menupopup);
    var fonts = fastdial.Utils.getFontList();
    for (var i = 0; i < fonts.length; i++) {
        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", fonts[i]);
        menupopup.appendChild(menuitem);
    }
}

function initSearchStyle() {
    var doc = content.document;
    var search = doc.getElementById("search");
    var input = doc.createElement("input");
    input.className = "search-input";
    search.appendChild(input);
    var fontFamily = fastdial.Dom.css(input, "font-family");
    fastdial.Utils.selectItem("search.font-family", fontFamily.match(/[^'"]+/));
    var fontSize = fastdial.Dom.css(input, "font-size");
    fastdial.Dom.get("search.font-size").value = parseInt(fontSize);
    setColor("search.color", fastdial.Dom.css(input, "color"));
    setColor("search.background", fastdial.Dom.css(input, "background-color"));
    setColor("search.border", fastdial.Dom.css(input, "border-top-color"));
    fastdial.Dom.remove(input);
}

function initThumbnailStyle() {
    var doc = content.document;
    var grid = doc.getElementById("grid");
    var box = doc.createElement("div");
    box.className = "box";
    grid.appendChild(box);

    var thumbnail = doc.createElement("div");
    thumbnail.className = "thumbnail";
    box.appendChild(thumbnail);

    var title = doc.createElement("div");
    title.className = "title";
    thumbnail.appendChild(title);
    var favicon = doc.createElement("img");
    title.appendChild(favicon);

    var names = ["thumbnail", "hover"];
    for (var i in names) {
        var name = names[i];
        fastdial.Dom.addClass(box, name == "hover" ? "hover" : "box");
        var background = fastdial.Dom.css(thumbnail, "background-color");
        setColor(name + ".background", background);
        var border = fastdial.Dom.css(thumbnail, "border-top-color");
        setColor(name + ".border", border);
        var margin = fastdial.Dom.css(thumbnail, "margin-top");
        fastdial.Dom.get(name + ".margin").value = parseInt(margin);
        var opacity = fastdial.Dom.css(thumbnail, "opacity");
        fastdial.Dom.get(name + ".opacity").value = opacity * 10;
        var round = fastdial.Dom.css(thumbnail, "border-top-right-radius");
        fastdial.Dom.get(name + ".round").value = parseInt(round);
        var shadow = fastdial.Dom.css(thumbnail, "box-shadow");
        fastdial.Dom.get(name + ".shadow").value = parseInt(shadow.match(/\d+px/));
        
        var titleColor = fastdial.Dom.css(title, "color");
        setColor(name + ".title.color", titleColor);
        var visibility = fastdial.Dom.css(title, "visibility");
        fastdial.Dom.get(name + ".title").checked = visibility != "hidden";
        fastdial.Dom.get(name + ".favicon").checked = fastdial.Dom.css(favicon, "display") != "none";
        var titleBackground = fastdial.Dom.css(title, "background-color");
        setColor(name + ".title.background", titleBackground);
        var titleBorder = fastdial.Dom.css(title, "border-top-color");
        setColor(name + ".title.border", titleBorder);
        fastdial.Dom.removeClass(thumbnail, "hover");
    }
    fastdial.Dom.remove(box);
}

function saveStyle() {
    var theme = fastdial.Prefs.getString("theme");
    var title = fastdial.Theme.getTitle(theme);
    fastdial.Theme.setStyle(getStyle(title));
    if (!/^~/.test(theme)) {
        var modified = theme ? "~" + theme : "~";
        fastdial.Prefs.setString("theme", modified);
        fastdial.Theme.copy("current", modified);
        initThemes();
    }
    reloadView();
}

function getStyle(title) {
    var style = [];
    var center = fastdial.Dom.get("center").checked;
    style["body"] = {
        "background-image"    : createImageURL("page"),
        "background-repeat"   : center ? "no-repeat" : "repeat",
        "background-position" : center ? "center center" : "top left",
        "background-size"     : center ? "cover" : "auto",
        "font-family"         : "'" + fastdial.Dom.get("font-family").label + "'",
        "font-size"           : fastdial.Dom.get("font-size").value + "px",
        "background-color"    : fastdial.Dom.get("background").value
    }
    style[".back"] = {
        "background-image" : createImageURL("back")
    }
    style[".search-input"] = {
        "font-family"      : "'" + fastdial.Dom.get("search.font-family").label + "'",
        "font-size"        : fastdial.Dom.get("search.font-size").value + "px",
        "color"            : getColor("search.color"),
        "background-color" : getColor("search.background"),
        "border"           : "1px solid " + getColor("search.border")
    }
    style["table.suggestion"] = {
        "font-family"      : "'" + fastdial.Dom.get("search.font-family").label + "'",
        "font-size"        : fastdial.Dom.get("search.font-size").value + "px"
    }        
    var thumbShadow = fastdial.Dom.get("thumbnail.shadow").value;
    style[".thumbnail"] = {
        "background-color" : getColor("thumbnail.background"),
        "border"           : "1px solid " + getColor("thumbnail.border"),
        "margin"           : fastdial.Dom.get("thumbnail.margin").value + "px",
        "opacity"          : fastdial.Dom.get("thumbnail.opacity").value / 10,
        "border-radius"    : fastdial.Dom.get("thumbnail.round").value + "px",
        "box-shadow"       : parseInt(thumbShadow) ? thumbShadow + "px " +
                                           thumbShadow + "px 5px #888888" : "none",
    }
    var hoverShadow = fastdial.Dom.get("hover.shadow").value;
    style["div.box:hover .thumbnail, .hover .thumbnail"] = {
        "background-color" : getColor("hover.background"),
        "border"           : "1px solid " + getColor("hover.border"),
        "margin"           : fastdial.Dom.get("hover.margin").value + "px",
        "opacity"          : fastdial.Dom.get("hover.opacity").value / 10,
        "border-radius"    : fastdial.Dom.get("hover.round").value + "px",
        "box-shadow"       : parseInt(hoverShadow) ? hoverShadow + "px " +
                                           hoverShadow + "px 5px #888888" : "none"
    }
    style[".title"] = {
        "color"            : getColor("thumbnail.title.color"),
        "visibility"       : fastdial.Dom.get("thumbnail.title").checked ? "inherit" : "hidden",
        "background-color" : getColor("thumbnail.title.background"),
        "border-top"       : "1px solid " + getColor("thumbnail.title.border")
    }
    style["div.box:hover .title, .hover .title"] = {
        "color"            : getColor("hover.title.color"),
        "visibility"       : fastdial.Dom.get("hover.title").checked ? "inherit" : "hidden",
        "background-color" : getColor("hover.title.background"),
        "border-top"       : "1px solid " + getColor("hover.title.border")
    }
    style[".title img"] = {
        "display" : fastdial.Dom.get("thumbnail.favicon").checked ? "inline" : "none"
    }
    style["div.box:hover .title img, .hover .title img"] = {
        "display" : fastdial.Dom.get("hover.favicon").checked ? "inline" : "none"
    }
    return createText(title, style);
}

function createText(title, style) {
  var result = "/**\r\n* @title " + (title || "") + "\r\n*/\r\n";
  for(var selector in style) {
    var props = style[selector];
    result += selector + " {\r\n";
    for(var name in props) {
      result += "  " + name + ": " + props[name] + ";\r\n";
    }
    result += "}\r\n";
  }
  return result;
}

function createImageURL(id) {
    return images[id] ? "url(" + images[id] + ")" : "none";
}

function getColor(id) {
    return fastdial.Dom.get(id).value || "transparent";
}

function setColor(id, value) {
    var value = convertColor(value);
    var textbox = fastdial.Dom.get(id);
    textbox.value = value;
    textbox.nextSibling.color = value;
}

function convertColor(color) {
    var match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
        function toHex(value) {
            value = parseInt(value).toString(16);
            return value.length == 1 ? "0" + value : value;
        }

        color = "#" + toHex(match[1]) + toHex(match[2]) + toHex(match[3]);
    }
    return color;
}

function updateColor(element) {
    element.nodeName == "colorpicker"
            ? element.previousSibling.value = element.color.toLowerCase()
            : element.nextSibling.color = element.value;
    saveStyle();
}

function browseImage(id) {
    var file = fastdial.File.chooseFile("open", ["images"]);
    if (file) {
        var url = fastdial.File.getFileURL(file);
        setImage(id, url);
    }
}

function setImage(id, url) {
    if (images[id]) {
        var file = fastdial.Theme.getDirectory("current");
        file.append(images[id]);
        try {
            file.remove(false);
        }
        catch(e) {}
        delete images[id];
    }
    if (url) {
        var uri = fastdial.URL.getNsiURL(url);
        var file = fastdial.Theme.getDirectory("current");
        file.append(decodeURI(uri.fileName));
        try {
            fastdial.File.writeBinaryFile(file, fastdial.URL.readURL(url));
            fastdial.Dom.get(id).value = images[id] =  uri.fileName;
        }
        catch(e) {}
    }
    saveStyle();
}

function initColorPickers() {
    var colorpickers = document.getElementsByTagName("colorpicker");
    for (var i = 0; i < colorpickers.length; i++) {
        var colorpicker = colorpickers[i];
        colorpicker.tabIndex = -1;
        colorpicker.addEventListener("click", onColorPickerClick, false);
    }
}

function onColorPickerClick(e) {
    if (e.button == 2) {
        e.target.color = "transparent";
        updateColor(e.target);
    }
}

function reloadView() {
    flushXULCache();
    var hiddenBox = wnd.document.getElementById("fd-hidden-box");
    var e = new Event("fastdial.reload");
    hiddenBox.dispatchEvent(e);
}

function flushXULCache() {
    var os = Components.classes["@mozilla.org/observer-service;1"].
                     getService(Components.interfaces.nsIObserverService);
    os.notifyObservers(null, "chrome-flush-caches", null);
}

function openHelp() {
    fastdial.Utils.openLink("http://www.userlogos.org/support#support", "tab");
}

function selectHomeFolder() {
    var result = {};
    openDialog("chrome://fastdial/content/folder.xul",
                           "", "chrome, centerscreen, modal, resizable", result);
    if (result.folderId) {
        fastdial.Bookmark.setHome(result.folderId);
        fastdial.Dom.get("folder").value = fastdial.Bookmark.getHome().title;
        reloadView();
    }
}
