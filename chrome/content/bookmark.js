fastdial.Bookmark = new function() {
    var self = this;

    var historyService =
            Components.classes["@mozilla.org/browser/nav-history-service;1"]
                               .getService(Components.interfaces.nsINavHistoryService);
    var bookmarksService =
            Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                                .getService(Components.interfaces.nsINavBookmarksService);
    var annotationService =
            Components.classes["@mozilla.org/browser/annotation-service;1"]
                                 .getService(Components.interfaces.nsIAnnotationService);

    this.DESCRIPTION = "bookmarkProperties/description";
    this.LOAD_IN_SIDEBAR = "bookmarkProperties/loadInSidebar";
    this.BOOKMARKS_MENU = bookmarksService.bookmarksMenuFolder;
    var queryOptions = Components.interfaces.nsINavHistoryQueryOptions;
    this.SORT_TITLE = queryOptions.SORT_BY_TITLE_ASCENDING;
    this.SORT_VISITS = queryOptions.SORT_BY_VISITCOUNT_DESCENDING;
    this.HOME = "fastdial/home";

    this.getHome = function() {
        var ids = this.getAnnotatedIds(this.HOME);
        if (ids.length) {
            return this.getBookmark(ids[0]);
        } else {
            var root = getLegacyRoot() || createRoot();
            this.setAnnotation(root.id, this.HOME, "true");
            return root;
        }
    };

    this.setHome = function(id) {
        var oldHome = this.getHome();
        this.removeAnnotation(oldHome.id, this.HOME);
        this.setAnnotation(id, this.HOME, "true");
    }

    function getLegacyRoot() {
        var bookmarks = self.getBookmarks(self.BOOKMARKS_MENU);
        for (var i in bookmarks) {
            var bookmark = bookmarks[i];
            if (bookmark.isFolder &&
                bookmark.title == fastdial.Info.NAME) return bookmark;
        }
    }

    function createRoot() {
        var root = {
            folderId: bookmarksService.bookmarksMenuFolder,
            isFolder: true,
            title:    fastdial.Info.NAME,
            index:    0
        };
        self.saveBookmark(root);
        return root;
    }

    this.query = function(id, sort, maxResults) {
        var query = getURL(id);
        if (sort) query += "&sort=" + sort;
        if (maxResults) query += "&maxResults=" + maxResults;
        var queries = {}, options = {};
        historyService.queryStringToQueries(query, queries, {}, options);
        return historyService.executeQueries(queries.value,
                queries.value.length, options.value);
    };
    function getURL(id) {
        try {
            return fastdial.Utils.decode(bookmarksService.getBookmarkURI(id).spec);
        }
        catch(e) {
            return "place:folder=" + id;
        }
    }

    this.isQuery = function(url) {
        return /^place:(?!folder)|^place:.*&(?!sort).*/.test(url);
    };
    this.isDynamic = function(bookmark) {
        return bookmark.feed || this.isQuery(bookmark.url);
    };
    this.getBookmarks = function(id, sort, maxResults) {
        var result = this.query(id, sort, maxResults);
        var container = result.root;
        var bookmarks = [];
        container.containerOpen = true;
        for (var i = 0; i < container.childCount; i++) {
            var item = container.getChild(i);
            if (item.type != item.RESULT_TYPE_SEPARATOR) {
                bookmarks.push({
                    id:       item.itemId,
                    folderId: item.parent.itemId,
                    isFolder: item.type == item.RESULT_TYPE_FOLDER ||
                              item.type == item.RESULT_TYPE_FOLDER_SHORTCUT ||
                              this.isQuery(item.uri),
                    url:      fastdial.Utils.decode(item.uri),
                    title:    item.title,
                    index:    item.bookmarkIndex,
                    description: this.getAnnotation(item.itemId, this.DESCRIPTION),
                    loadInSidebar: this.getAnnotation(item.itemId, this.LOAD_IN_SIDEBAR)
                });
            }
        }
        container.containerOpen = false;
        return bookmarks;
    }
    function getSystemId(id) {
        try {
            var annotation = self.getAnnotation(id, "placesInternal/READ_ONLY");
            switch (annotation) {
                case "AllBookmarks":
                    return bookmarksService.placesRoot;
                case "BookmarksMenu":
                    return bookmarksService.bookmarksMenuFolder;
                case "BookmarksToolbar":
                    return bookmarksService.toolbarFolder;
                case "UnfiledBookmarks":
                    return bookmarksService.unfiledBookmarksFolder;
                case "Tags":
                    return bookmarksService.tagsFolder;
            }
        } catch(e) {
        }
    }

    this.getBookmark = function(id) {
        if (!id) return null;
        id = getSystemId(id) || id;
        var url = getURL(id);
               var bookmark = {
            id:       id,
            url:      url,
            title:    bookmarksService.getItemTitle(id),
            index:    bookmarksService.getItemIndex(id),
            folderId: bookmarksService.getFolderIdForItem(id),
            isFolder: this.isQuery(url) ||
                      bookmarksService.getItemType(id) == bookmarksService.TYPE_FOLDER,
            description: this.getAnnotation(id, this.DESCRIPTION),
            loadInSidebar: this.getAnnotation(id, this.LOAD_IN_SIDEBAR)
        };
        return bookmark;
    };
    this.saveBookmark = function(bookmark) {
        if (!bookmark.title) bookmark.title = "";
        if (!bookmark.id) bookmark.id = createBookmark(bookmark);
        else updateBookmark(bookmark);
        this.setAnnotation(bookmark.id, this.DESCRIPTION, bookmark.description);
        if (bookmark.index == -1) {
            bookmark.index = bookmarksService.getItemIndex(bookmark.id);
        }
    };
    function createBookmark(bookmark) {
        if (bookmark.isFolder && !self.isQuery(bookmark.url)) {
            return bookmarksService.createFolder(bookmark.folderId,
                    bookmark.title, bookmark.index);
        }
        else {
            return bookmarksService.insertBookmark(bookmark.folderId,
                    fastdial.URL.getNsiURI(bookmark.url), bookmark.index, bookmark.title);
        }
    }

    function updateBookmark(bookmark) {
        if (!bookmark.isFolder) {
            var uri = fastdial.URL.getNsiURI(bookmark.url);
            bookmarksService.changeBookmarkURI(bookmark.id, uri);
        }
        bookmarksService.setItemTitle(bookmark.id, bookmark.title);
        if (bookmark.folderId != -1) {
            bookmarksService.moveItem(bookmark.id, bookmark.folderId, bookmark.index);
        }
    }

    this.removeBookmark = function(id) {
        this.removeAnnotation(id, this.DESCRIPTION);
        try {
            bookmarksService.removeItem(id);
        }
        catch(e) {
        }
    };
    this.getAnnotation = function(id, name) {
        try {
            return annotationService.getItemAnnotation(id, name);
        }
        catch(e) {
        }
    };
    this.setAnnotation = function(id, name, value) {
        if (!value) return this.removeAnnotation(id, name);
        annotationService.setItemAnnotation(id,
                name, value, 0, annotationService.EXPIRE_NEVER);
    };
    this.removeAnnotation = function(id, name) {
        try {
            annotationService.removeItemAnnotation(id, name);
        }
        catch(e) {
        }
    };
    this.getAnnotatedIds = function(name) {
        return annotationService.getItemsWithAnnotation(name, {});
    };
    this.getFavicon = function(url, onLoad) {
        var uri = fastdial.URL.getNsiURL(url);
        try {
            var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
                                              .getService(Components.interfaces.mozIAsyncFavicons);
            faviconService.getFaviconDataForPage(uri, { onComplete:
                function(aURI, aDataLen, aData, aMimeType) {
                    if (aURI) onLoad("data:" + aMimeType + ";base64," +
                                        btoa(String.fromCharCode.apply(null, aData)));
                }
            });
        }
        catch(e) {}
    };
    this.setFavicon = function(url, favicon) {
       var uri = fastdial.URL.getNsiURL(url);
       var faviconURI = fastdial.URL.getNsiURL(favicon);
       try {
           var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
                                              .getService(Components.interfaces.mozIAsyncFavicons);
           faviconService.setAndFetchFaviconForPage(uri, faviconURI, false, null);
       }
       catch(e) {}
    };
}
