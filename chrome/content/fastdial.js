var options, sort, thumbnails;
var page = 0, pageCount, perPage;
var params = fastdial.Utils.getQueryParams(document.location);
var wnd = fastdial.Utils.getBrowserWindow();

var folder, home = fastdial.Storage.getHome();
if (!params.folder || params.folder == home.id) folder = home;
else try {
    folder = fastdial.Storage.getItem(params.folder);
    folder.parent = fastdial.Storage.getItem(folder.folderId);
    folder.parent.isBack = true;
}
catch(e) {}
document.title = folder.title;

window.addEventListener("resize", onResize, false);
document.addEventListener("contextmenu", onContextMenu, false);
document.addEventListener("mousedown", onMouseDown, true);
document.addEventListener("mouseup", onMouseUp, false);
document.addEventListener("drop", onDragDrop, false);
document.addEventListener("click", onClick, false);
document.addEventListener("DOMMouseScroll", onMouseWheel, false);
document.addEventListener("keyup", onKeyUp, false);
document.addEventListener("unload", onUnload, false);

var hiddenBox = wnd.document.getElementById("fd-hidden-box");
hiddenBox.addEventListener("fastdial.update", initThumbnails, false);
hiddenBox.addEventListener("fastdial.clearCache", onClearCache, false);
hiddenBox.addEventListener("fastdial.reload", onReload, false);

initThumbnails();

function initThumbnails() {
    options = fastdial.Prefs.getObject("options");
    sort = fastdial.Prefs.getString("sort");
    thumbnails = getThumbnails();

    var data = fastdial.URL.readURL("chrome://fastdial/content/template/fastdial.tpl");
    var template = new JsTemplate.Template(data);
    var html = template.run({
        search: fastdial.Prefs.getObject("search"),
        options: options,
        thumbnails: thumbnails
    });
    document.body.innerHTML = html;

    for (var i in thumbnails) getFavicon(i);
    onResize();
}

function getThumbnails() {
    var thumbs = [];
    var items = fastdial.Storage.getItems(folder.id, sort);
    perPage = (showBack() ? -1 : 0) + options.width * options.height;
    pageCount = Math.ceil(items.length / perPage);
    for (var i = 0; i < perPage; i++) {
        var properties = items[page * perPage + i];
        if (properties) {
            var thumb = new fastdial.Thumbnail(properties);
            if (!thumb.isLoading() &&
                    !thumb.getImageFile().exists())
                wnd.fastdial.Snapshot.create(thumb.properties);
            thumbs[i] = thumb;
        }
    }
    if (showBack()) {
        var back = new fastdial.Thumbnail(folder.parent);
        thumbs.unshift(back);
    }
    return thumbs;
}
function showBack() {
    return !options.hideBack && folder.parent;
}
function getThumbIndex(index) {
    return !sort && page * perPage + (showBack() ? -1 : 0) + parseInt(index);
}
function onResize() {
    var grid = fastdial.Dom.get("grid");
    var gridMargin = parseInt(fastdial.Dom.css(grid, "margin-left"));

    var search = fastdial.Dom.get("search");
    var box = fastdial.Dom.get(0);
    var thumbnail = fastdial.Dom.child(box, "thumbnail");
    var thumbnailBorder = parseInt(fastdial.Dom.css(thumbnail, "border-top-width"));
    var thumbnailMargin = parseInt(fastdial.Dom.css(thumbnail, "margin-left"));

    var title = fastdial.Dom.child(thumbnail, "title");
    var width = options.thumbWidth;
    var height = fastdial.Thumbnail.getHeight(width);
    if (!options.fixed) {
        width = (window.innerWidth - gridMargin * 2) / options.width -
                 thumbnailMargin * 2 - thumbnailBorder * 2;

        height = (window.innerHeight - gridMargin * 2 - search.offsetHeight) /
                  options.height - thumbnailMargin * 2 - thumbnailBorder * 2 - title.offsetHeight;

        if (height < fastdial.Thumbnail.getHeight(width)) {
            width = fastdial.Thumbnail.getWidth(height);
        }
    }
    width = Math.max(width, fastdial.Thumbnail.MIN_WIDTH);
    height = fastdial.Thumbnail.getHeight(width);

    width += thumbnailMargin * 2 + thumbnailBorder * 2;
    height += thumbnailMargin * 2 + thumbnailBorder * 2 + title.offsetHeight;

    // Center #layout
    var layoutTop = (window.innerHeight - gridMargin * 2 -
                     height * options.height - search.offsetHeight) / 2;
    var layoutLeft = (window.innerWidth - gridMargin * 2 - width * options.width) / 2;
    if (layoutTop < 0) layoutTop = 0;
    if (layoutLeft < 0) layoutLeft = 0;

    fastdial.Dom.get("size").innerHTML = 
            (options.hideEmpty ? ".empty { visibility: hidden; }" : "") +
            "#layout {" + 
            "margin-top: " + layoutTop + ";" +
            "margin-left: " + layoutLeft + ";" +
            "}" +
            ".box {" +
            "width: " + width + ";" +
            "height: " + height + ";" +
            "}";
}

function onContextMenu(e) {
    if (fastdial.Dom.is(e.target, "search-input")) return;
    wnd.document.popupNode = e.target;
    var box = fastdial.Dom.parent(e.target, "box");
    wnd.fastdial.Overlay.showContextMenu(e, box && thumbnails[box.id]);
    e.preventDefault();
}
var source;
var previewTimeout;

function onMouseDown(e) {
    hidePreview();

    if (!fastdial.Dom.is(e.target, "image")) return;
    if (!sort) fastdial.Drag.draggable(e.target);

    var box = fastdial.Dom.parent(e.target, "box");
    source = thumbnails[box.id];
    if (e.button == 0 && source.properties.preview) {
        previewTimeout = setTimeout(function() {
            showPreview(source);
        }, 500);
    }
}
function onMouseUp(e) {
    clearTimeout(previewTimeout);
    fastdial.Drag.enable();
}
function showPreview(thumb) {
    if (fastdial.Drag.inProgress()) return;
    fastdial.Drag.disable();
    thumb.openPreview(document);
}
function hidePreview() {
    var preview = fastdial.Dom.get("preview");
    if (preview) {
        fastdial.Dom.remove(preview);
    }
}
function onDragDrop(e) {
    for (var i = 0; i < options.width * options.height; i++) {
        if (!isMouseOver(fastdial.Dom.get(i), e.pageX - document.body.scrollLeft,
                                              e.pageY - document.body.scrollTop)) continue;
        var target = thumbnails[i];
        if (target) {
            if (target.properties.isBack || e.ctrlKey && target.properties.isFolder) {
                source.properties.folderId = target.properties.id;
                source.properties.index = -1;
                delete source.properties.thumbIndex;
                source.save();
            }
            else {
                source.properties.thumbIndex = target.properties.thumbIndex;
                source.save();
                for (var j = target.properties.thumbIndex; thumbnails[j] &&
                     thumbnails[j].properties.id != source.properties.id; j++) {
                    thumbnails[j].properties.thumbIndex++;
                    thumbnails[j].save(); 
                }
            }
        }
        else {
            source.properties.thumbIndex = getThumbIndex(i);
            source.save();
        }
        wnd.fastdial.Overlay.updateView();
    }
}
function isMouseOver(element, x, y) {
    x += document.body.scrollLeft;
    y += document.body.scrollTop;
    var position = fastdial.Dom.position(element);
    return x > position.left &&
            y > position.top &&
            x < position.left + element.offsetWidth &&
            y < position.top + element.offsetHeight;
}

var currentSearch;

function onClick(e) {
    if (fastdial.Dom.is(e.target, "search-icon")) {
        currentSearch = e.target;
        e.preventDefault();
        var menupopup = wnd.fastdial.Dom.get("fd-search-menu");
        var offset = -0.4 * parseFloat(fastdial.Dom.css(e.target, "font-size"));
        return menupopup.openPopup(e.target, "after_start", 0, offset, false, true);
    }
    var box = fastdial.Dom.parent(e.target, "box");
    if (!box || e.button != 0) return;

    var thumbnail = thumbnails[box.id];
    if (!thumbnail) {
        var properties = {
            folderId: folder.id,
            thumbIndex: getThumbIndex(box.id),
            index: -1
        };
        var thumbnail = new fastdial.Thumbnail(properties);
        return thumbnail.openProperties();
    }
    if (fastdial.Dom.is(e.target, "image")) {
        window.focus();
        e.preventDefault();
        var where = !thumbnail.properties.isFolder && options.openIn;
        return thumbnail.open(where || e);
    }
    return null;
}
const TIMEOUT_WHEEL = 250;
var wheelTime = 0;

function onMouseWheel(e) {
    if (scrollMaxY) return;
    var time = new Date().getTime();
    if (time - wheelTime > TIMEOUT_WHEEL) {
        wheelTime = time;
        setPage(page + e.detail / Math.abs(e.detail));
    }
}
function onKeyUp(e) {
    switch (e.keyCode) {
        case e.DOM_VK_PAGE_UP:
            if (!scrollMaxY) setPage(page - 1);
            break;
        case e.DOM_VK_PAGE_DOWN:
            if (!scrollMaxX) setPage(page + 1);
            break;
        case e.DOM_VK_ESCAPE:
            if (fastdial.Dom.is(e.target, "search-input")) {
                e.target.value = null;
            }
            break;
        case e.DOM_VK_RETURN:
            if (!fastdial.Dom.is(e.target, "search-input")) break;

            var search = fastdial.Prefs.getObject("search");
            var searchInputs = document.getElementsByClassName("search-input");

            for(var i = 0; i < searchInputs.length; i++) {
                if (searchInputs[i] == e.target) {
                    var engine = fastdial.Utils.getSearchEngine(search[i]);
                    var submission = engine.getSubmission(e.target.value, null);
                    document.location.assign(submission.uri.spec);
                }
            }
            break;
    }
}
function setPage(aPage) {
    if (aPage >= pageCount) {
      aPage = fastdial.Drag.inProgress() ? pageCount : pageCount - 1;
    }
    if (aPage < 0) aPage = 0;
    if (page != aPage) {
        page = aPage;
        initThumbnails();
    }
}

function getFavicon(index) {
    const ICON_FOLDER = "chrome://fastdial/skin/icons/folder.png";
    var thumb = thumbnails[index];

    thumb.properties.isFolder 
        ? onIconLoad(ICON_FOLDER) 
        : fastdial.Bookmark.getFavicon(thumb.getURL(), onIconLoad);

    function onIconLoad(iconURL) {
       var box = fastdial.Dom.get(index);
       if (box) {
           var span = fastdial.Dom.child(box, "span");
           var icon = fastdial.Dom.child(span, "img");
           if (!icon) {
               icon = document.createElement("img");
               icon.setAttribute("src", iconURL);
               fastdial.Dom.prepend(span.parentNode, icon);
           }
       }
    }
}

function onUnload() {
    window.removeEventListener("resize", onResize, false);
    document.removeEventListener("contextmenu", onContextMenu, false);
    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("drop", onDragDrop, false);
    document.removeEventListener("click", onClick, false);
    document.removeEventListener("DOMMouseScroll", onMouseWheel, false);
    document.removeEventListener("keyup", onKeyUp, false);
    document.removeEventListener("unload", onUnload, false);

    var hiddenBox = wnd.document.getElementById("fd-hidden-box");
    hiddenBox.removeEventListener("fastdial.update", initThumbnails, false);
    hiddenBox.removeEventListener("fastdial.clearCache", onClearCache, false);
    hiddenBox.removeEventListener("fastdial.reload", onReload, false);
}

function onClearCache(e) {
    fastdial.URL.removeFromCache(document, e.detail);
}

function onReload(e) {
    window.location.reload();
}