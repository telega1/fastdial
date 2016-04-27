fastdial.Loader = new function() {
    const MAX_BROWSERS = 3;
    const TIMEOUT_LOAD = 30000;

    var queue = [];
    var browsers = [];

    this.load = function(url, onReady) {
        var browser = browsers[url];
        if (browser) {
            browser.close();
        }
        queue[url] = onReady;
        processQueue();
    };
    this.stop = function(url) {
        delete queue[url];
        var browser = browsers[url];
        if (browser) {
            browser.close();
        }
    };
    this.isLoading = function(url) {
        return browsers[url];
    };
    function getBrowserCount() {
        var count = 0;
        for (var i in browsers) count++;
        return count;
    }

    function getNext() {
        for (var url in queue) {
            var onReady = queue[url];
            delete queue[url];
            return { url: url, onReady: onReady };
        }
        return null;
    }

    function processQueue() {
        if (getBrowserCount() >= MAX_BROWSERS) return;
        var item = getNext();
        if (!item) return;
        var browser = browsers[item.url] = document.createElement("browser");
        browser.width = 1024;
        browser.height = 768;
        browser.setAttribute("type", "content");
        document.getElementById("fd-hidden-box").appendChild(browser);
        browser.close = function() {
            delete browsers[item.url];
            browser.parentNode.removeChild(browser);
            processQueue();
        };
        browser.timeout = setTimeout(function() {
            onLoad();
        }, TIMEOUT_LOAD);
        browser.addEventListener("load", onLoad, true);
        function onLoad() {
            clearTimeout(browser.timeout);
            browser.removeEventListener("load", onLoad, true);
            item.onReady(browser);
        }
        browser.setAttribute("src", item.url);
    }
}

fastdial.Snapshot = function(thumbnail) {
    thumbnail.properties.logo && thumbnail.properties.title ? loadLogo() : loadSite();

    function loadSite() {
        fastdial.Loader.load(thumbnail.getURL(), function(browser) {
            var doc = browser.contentDocument;
            fastdial.Bookmark.setFavicon(thumbnail.properties.url, getFavicon(doc));
            if (!thumbnail.properties.title) {
                thumbnail.properties.title = doc.title;
                thumbnail.save();
            }
            if (thumbnail.properties.logo) {
                browser.close();
                loadLogo();
            }
            else saveImage(browser, false);
        });
    }

    function getFavicon(doc) {
        var links = doc.getElementsByTagName("link");
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (/^(shortcut )?icon$/i.test(link.rel)) return link.href;
        }
        if (!fastdial.URL.isLocal(doc.location)) {
            var uri = fastdial.URL.getNsiURL(doc.location);
            return uri.prePath + "/favicon.ico";
        }
        return null;
    }

    function loadLogo() {
        fastdial.Loader.load(thumbnail.properties.logo, function(browser) {
            saveImage(browser, true);
        });
    }

    function saveImage(browser, isLogo) {
        var options = fastdial.Prefs.getObject("options");
        var timeout = parseInt(options.timeout);
        var url = browser.contentWindow.location.href;

        if (!timeout || fastdial.URL.isLocal(url)) {
            timeout = fastdial.Snapshot.TIMEOUT_ULTRAFAST;
        }
        var slowSites = fastdial.Prefs.getString("slowSites");
        if (url.match(slowSites)) {
            timeout += fastdial.Snapshot.TIMEOUT_MEDIUM;
        }
        setTimeout(function() {
                    var snapshot = thumbnail.getSnapshotURL();
                    if (thumbnail.properties.preview) {
                        var preview = fastdial.Snapshot.createImage(browser.contentWindow, browser.width, isLogo);
                        fastdial.Cache.remove(snapshot, "preview");
                        fastdial.Cache.save(snapshot, preview, "preview");
                    }
                    var image = fastdial.Snapshot.createImage(
                                         browser.contentWindow, options.thumbWidth, isLogo);
                    fastdial.Cache.remove(snapshot);
                    fastdial.Cache.save(snapshot, image);
                    browser.close();
                    fastdial.Overlay.updateView();
                },
                timeout);
    }
}

fastdial.Snapshot.TIMEOUT_ULTRAFAST = 100;
fastdial.Snapshot.TIMEOUT_MEDIUM = 5000;

fastdial.Snapshot.create = function(properties) {
    var thumbnail = new fastdial.Thumbnail(properties);
    new fastdial.Snapshot(thumbnail);
}

fastdial.Snapshot.createImage = function(wnd, imageWidth, isLogo) {
    var doc = wnd.document;
    var width = doc.documentElement.offsetWidth;
    var height = fastdial.Thumbnail.getHeight(width);
    var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = imageWidth;
    canvas.height = fastdial.Thumbnail.getHeight(canvas.width);
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / width, canvas.height / height);
    if (isLogo) {
        var img = doc.body.firstChild;
        context.drawImage(img, 0, 0, width, height);
    } else {
        context.drawWindow(wnd, 0, 0, width, height, "rgba(0,0,0,0)");
    }
    context.restore();
    var dataURL = canvas.toDataURL("image/png");
    return atob(dataURL.replace(/^data:image\/png;base64,/, ""));
}

fastdial.Snapshot.createScreenshot = function(url, file) {
    fastdial.Loader.load(url, function(browser) {
        setTimeout(function() {
            var image = fastdial.Snapshot.createImage(browser.contentWindow, 1024);
            fastdial.File.writeBinaryFile(file, image);
            browser.close();
        }, fastdial.Snapshot.TIMEOUT_ULTRAFAST);
    });
}
