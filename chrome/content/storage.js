var FdStorage = new function() {
    this.SHORTCUT_KEY = "fastdial/shortcutKey";
    this.REFRESH = "fastdial/refresh";
    this.getFolderURL = function(id) {
        if (id) return FdInfo.URI + "?folder=" + id;
        return null;
    };
    this.getURL = function(item) {
        return item.id && item.isFolder
                ? FdStorage.getFolderURL(item.id) : item.url;
    };
    this.getHome = function() {
        var home = FdBookmark.getHome();
        getProperties(home);
        return home;
    };
    function getProperties(bookmark) {
        var annotation = FdBookmark.getAnnotation(bookmark.id, FdInfo.ID);
        FdUtils.merge(bookmark, FdUtils.fromJSON(annotation));
        bookmark.shortcutKey = FdBookmark.getAnnotation(bookmark.id, FdStorage.SHORTCUT_KEY);
        bookmark.refresh = FdBookmark.getAnnotation(bookmark.id, FdStorage.REFRESH);
    }

    function saveProperties(item) {
        if (item.id == -1) return;
        var annotation = FdUtils.clone(item);
        var exclude = ["id", "folderId", "isFolder", "url", "title", "index",
                       "description", "shortcutKey", "refresh", "loadInSidebar"];
        for (var i in exclude) {
            delete annotation[exclude[i]];
        }
        FdBookmark.setAnnotation(item.id, FdInfo.ID, FdUtils.toJSON(annotation));
        FdBookmark.setAnnotation(item.id, FdStorage.SHORTCUT_KEY, item.shortcutKey);
        FdBookmark.setAnnotation(item.id, FdStorage.REFRESH, item.refresh);
    }

    this.getItem = function(id) {
        var bookmark = FdBookmark.getBookmark(id);
        getProperties(bookmark);
        return bookmark;
    };
    this.getItems = function(folderId, order, maxResults) {
        var sort = order == "title" ? FdBookmark.SORT_TITLE :
                order == "visits" ? FdBookmark.SORT_VISITS : 0;
        var items = [];
        var bookmarks = FdBookmark.getBookmarks(folderId, sort, maxResults);
        for (var i = 0; i < bookmarks.length; i++) {
            var bookmark = bookmarks[i];
            getProperties(bookmark);
            if (order) items.push(bookmark);
            else {
                if (bookmark.thumbIndex == undefined || items[bookmark.thumbIndex]) {
                    bookmark.thumbIndex = getFreeIndex(items);
                    if (bookmark.folderId != -1) saveProperties(bookmark);
                }
                items[bookmark.thumbIndex] = bookmark;
            }
        }
        return items;
    };
    function getFreeIndex(items) {
        for (var i = 0; ; i++) {
            if (!items[i]) return i;
        }
    }

    this.saveItem = function(item) {
        FdBookmark.saveBookmark(item);
        saveProperties(item);
    };
    this.removeItem = function(id) {
        FdBookmark.removeAnnotation(id, this.SHORTCUT_KEY);
        FdBookmark.removeAnnotation(id, this.REFRESH);
        FdBookmark.removeAnnotation(id, FdInfo.ID);
        FdBookmark.removeBookmark(id);
    };
    this.getAnnotatedItems = function(annotation) {
        var items = [];
        var ids = FdBookmark.getAnnotatedIds(annotation);
        for (var i in ids) {
            var item = this.getItem(ids[i]);
            items.push(item);
        }
        return items;
    };
}
