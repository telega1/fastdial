fastdial.Overlay = {
    openPreferences: function() {
        openDialog("chrome://fastdial/content/preferences.xul",
                              "preferences", "chrome,centerscreen,toolbar");
    },

    isNewFirefox: function() {
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                  .getService(Components.interfaces.nsIXULAppInfo);
        var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                          .getService(Components.interfaces.nsIVersionComparator);
        return versionChecker.compare(appInfo.version, "33.0") >= 0;
    },

    addTab: null,
    isBlankPageURL: null,

    hookAddTab: function() {
        fastdial.Overlay.addTab = gBrowser.addTab;
        fastdial.Overlay.isBlankPageURL = window.isBlankPageURL;

        gBrowser.addTab = function() {
            var oldBlankTab = arguments[0] == "about:blank" && !fastdial.Overlay.isNewFirefox();
            if ((arguments[0] == "about:newtab" || oldBlankTab) &&
                 fastdial.Prefs.getBool("enable")) arguments[0] = fastdial.Info.URI;
            return fastdial.Overlay.addTab.apply(gBrowser, arguments);
        }

        var regExp = new RegExp("^" + fastdial.Info.URI); 
        window.isBlankPageURL = function() {
            return regExp.test(arguments[0]) ||
                   fastdial.Overlay.isBlankPageURL.apply(window, arguments);
        }

    },

    initialize: function() {
        setTimeout(fastdial.Overlay.hookAddTab, fastdial.Prefs.getInt("startTimeout"));
        if (window.gInitialPages) {
            gInitialPages.push(fastdial.Info.URI);
        }
        fastdial.Legacy.migrate();
        fastdial.Overlay.initShortcutKeys();
        fastdial.Overlay.autoRefresh();
        fastdial.Overlay.initSort();
        var mainMenu = fastdial.Dom.get("contentAreaContextMenu");
        mainMenu.addEventListener("popupshowing", fastdial.Overlay.onMainMenu, false);
    },

    initShortcutKeys: function() {
        var options = fastdial.Prefs.getObject("options");
        if (options.shortcutKey) {
            var home = fastdial.Storage.getHome();
            fastdial.Overlay.createShortcutKey(options.shortcutKey, home.id);
        }
        var items = fastdial.Storage.getAnnotatedItems(fastdial.Storage.SHORTCUT_KEY);
        for (var i in items) {
            var item = items[i];
            fastdial.Overlay.createShortcutKey(item.shortcutKey, item.id);
        }
    },

    createShortcutKey: function(shortcutKey, id) {
        var modifiers = "";
        if (shortcutKey.match(/Ctrl/)) modifiers += "accel ";
        if (shortcutKey.match(/Alt/)) modifiers += "alt ";
        if (shortcutKey.match(/Shift/)) modifiers += "shift ";
        var key = document.createElement("key");
        key.setAttribute("modifiers", modifiers);
        key.setAttribute("key", shortcutKey.match(/.$/));
        key.setAttribute("oncommand", "fastdial.Overlay.openItem(" + id + ");");
        fastdial.Dom.prepend(fastdial.Dom.get("mainKeyset"), key);
    },

    openItem: function(id) {
        var item = fastdial.Storage.getItem(id);
        item.loadInSidebar
            ? openWebPanel(item.title, item.url)
            : fastdial.Utils.openLink(fastdial.Storage.getURL(item), "tab");
    },

    autoRefresh: function() {
        var currentTime = new Date().getTime();
        var items = fastdial.Storage.getAnnotatedItems(fastdial.Storage.REFRESH);
        var refreshing = false;
        for (var i in items) {
            var item = items[i];
            var url = fastdial.Storage.getURL(item);
            var lastRefresh = fastdial.Cache.getCachedTime(url);
            if (!lastRefresh ||
                    lastRefresh + item.refresh * 60 * 1000 < currentTime) {
                refreshing = true;
                fastdial.Snapshot.create(item);
            }
        }
        if (refreshing) fastdial.Overlay.updateView();
        setTimeout(fastdial.Overlay.autoRefresh, 60 * 1000);
    },

    initSort: function() {
        var menupopup = fastdial.Dom.get("fd-sort-menu").firstChild;
        var sort = fastdial.Prefs.getString("sort");
        for (var i = 0; i < menupopup.childNodes.length; i++) {
            var menuitem = menupopup.childNodes[i];
            if (menuitem.value == sort) {
                menuitem.setAttribute("checked", "true");
            }
        }
    },

    thumbnail: null,

    showContextMenu: function(e, thumbnail) {
        fastdial.Overlay.thumbnail = thumbnail;
        var wnd = content.wrappedJSObject;
        var isReadOnly = !thumbnail || thumbnail.properties.isBack;
        fastdial.Dom.get("fd-add-menu").hidden = fastdial.Bookmark.isDynamic(wnd.folder);
        fastdial.Dom.get("fd-open-all").hidden = isReadOnly || !thumbnail.properties.isFolder;
        fastdial.Dom.get("fd-refresh").hidden = isReadOnly;
        fastdial.Dom.get("fd-move").hidden = isReadOnly;
        fastdial.Dom.get("fd-remove").hidden = isReadOnly;
        fastdial.Dom.get("fd-preview").hidden = isReadOnly || !thumbnail.properties.preview;
        fastdial.Dom.get("fd-separator2").hidden = isReadOnly;
        fastdial.Dom.get("fd-properties").hidden = isReadOnly;
        fastdial.Dom.get("fd-menu").openPopupAtScreen(e.screenX, e.screenY, true);
    },

    onContextCommand: function(e, command) {
        var thumbnail = fastdial.Overlay.thumbnail;
        var wnd = content.wrappedJSObject;
        switch (command) {
            case "fd-open-all":
                thumbnail.openAll();
                break;
            case "fd-refresh":
                thumbnail.refresh();
                break;
            case "fd-move":
                var result = {};
                openDialog("chrome://fastdial/content/folder.xul",
                                      "", "chrome, centerscreen, modal, resizable", result);
                if (result.folderId && 
                               result.folderId != thumbnail.properties.id) {
                    thumbnail.properties.folderId = result.folderId;
                    thumbnail.properties.index = -1;
                    delete thumbnail.properties.thumbIndex;
                    thumbnail.save();
                    fastdial.Overlay.updateView();
                }
                break;
            case "fd-remove":
                thumbnail.remove(true);
                break;
            case "fd-preview":
                thumbnail.openPreview(wnd.document);
                break;
            case "fd-export":
                fastdial.Storage.export(wnd.folder);
                break;
            case "fd-import":
                fastdial.Storage.import(wnd.folder);
                fastdial.Overlay.updateView();
                break;
            case "fd-preferences":
                fastdial.Overlay.openPreferences();
                break;
            case "fd-properties":
                thumbnail.openProperties();
                break;
            case "fd-add-menu":
                var box = fastdial.Dom.parent(document.popupNode, "box");
                var properties = {
                    folderId: wnd.folder.id,
                    isFolder: e.target.value == "folder",
                    logo: e.target.value == "folder" && fastdial.Prefs.getString("folderLogo"),
                    thumbIndex: box && wnd.getThumbIndex(box.id),
                    index: -1,
                }
                var thumbnail = new fastdial.Thumbnail(properties);
                thumbnail.openProperties();
                break;
            case "fd-sort-menu":
                fastdial.Prefs.setString("sort", e.target.value);
                fastdial.Overlay.updateView();
                break;
            case "fd-refresh-all":
                var wnd = content.wrappedJSObject;
                for (var i in wnd.thumbnails) {
                    var thumbnail = wnd.thumbnails[i];
                    if (thumbnail.isRefreshAll()) fastdial.Snapshot.create(thumbnail.properties);
                }
                fastdial.Overlay.updateView();
                break;
        }
    },

    initSearchMenu: function(menupopup) {
        fastdial.Dom.clear(menupopup);
        var engines = fastdial.Utils.getSearchEngines();

        for (var i in engines) {
            var menuitem = document.createElement("menuitem");
            menuitem.setAttribute("label", engines[i].name);
            var icon = engines[i].iconURI;
            if (icon) {
                menuitem.setAttribute("class", "menuitem-iconic");
                menuitem.setAttribute("image", icon.spec);
                menuitem.addEventListener("command", fastdial.Overlay.setSearchEngine, false);
            }
            menupopup.appendChild(menuitem);
        }
    },

    setSearchEngine: function(event) {
        var search = fastdial.Prefs.getObject("search");
        var wnd = content.wrappedJSObject;
        var searchIcons = wnd.document.getElementsByClassName("search-icon");

        for(var i = 0; i < searchIcons.length; i++) {
            if (searchIcons[i] == wnd.currentSearch) search[i] = event.target.label;
        }
        fastdial.Prefs.setObject("search", search);
        fastdial.Overlay.updateView();
    },

    onMainMenu: function(e) {
        var options = fastdial.Prefs.getObject("options");
        fastdial.Dom.get("fd-add-page").hidden = (options.askFolder == "none");
    },

    addPage: function(e) {
        var folderId;
        var options = fastdial.Prefs.getObject("options");
        if (options.askFolder == "folders") {
            var result = {};
            openDialog("chrome://fastdial/content/folder.xul", "", "chrome, centerscreen, modal, resizable", result);
            folderId = result.folderId;
        }
        else {
            var home = fastdial.Bookmark.getHome();
            folderId = home.id;
        }
        if (folderId) {
            var bookmark = {
                url: gBrowser.selectedBrowser.currentURI.spec,
                folderId: folderId,
                index: -1
            }
            fastdial.Bookmark.saveBookmark(bookmark);
            fastdial.Overlay.updateView();
        }
    },

    updateView: function() {
        var hiddenBox = fastdial.Dom.get("fd-hidden-box");
        var e = new Event("fastdial.update");
        hiddenBox.dispatchEvent(e);
    }
}

addEventListener("load",
        fastdial.Overlay.initialize, false);
 