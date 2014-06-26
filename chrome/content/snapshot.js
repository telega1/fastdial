var FdLoader = new function() {
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
        document.getElementById("hidden-box").appendChild(browser);
        browser.close = function() {
            delete browsers[item.url];
            browser.parentNode.removeChild(browser);
            processQueue();
        };
        browser.timeout = setTimeout(onLoad, TIMEOUT_LOAD);
        browser.addEventListener("load", onLoad, true);
        function onLoad() {
            clearTimeout(browser.timeout);
            browser.removeEventListener("load", onLoad, true);
            item.onReady(browser);
        }
        browser.setAttribute("src", item.url);
    }
};
function FdSnapshot(thumbnail) {
    thumbnail.properties.logo && thumbnail.properties.title ? loadLogo() : loadSite();

    function loadSite() {
        FdLoader.load(thumbnail.getURL(), function(browser) {
            var doc = browser.contentDocument;
            FdBookmark.setFavicon(thumbnail.properties.url, getFavicon(doc));
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
        if (!FdURL.isLocal(doc.location)) {
            var uri = FdURL.getNsiURL(doc.location);
            return uri.prePath + "/favicon.ico";
        }
        return null;
    }

    function loadLogo() {
        FdLoader.load(thumbnail.properties.logo, function(browser) {
            saveImage(browser, true);
        });
    }

    function saveImage(browser, isLogo) {
        var options = FdPrefs.getObject("options");
        var timeout = parseInt(options.timeout);
        var url = browser.contentWindow.location.href;
        if (!timeout || FdURL.isLocal(url)) {
            timeout = FdSnapshot.TIMEOUT_ULTRAFAST;
        }
        var slowSites = FdPrefs.getString("slowSites");
        if (url.match(slowSites)) {
            timeout += FdSnapshot.TIMEOUT_MEDIUM;
        }
        setTimeout(function() {
                    var snapshot = thumbnail.getSnapshotURL();
                    if (thumbnail.properties.preview) {
                        var preview = FdSnapshot.createImage(
                                           browser.contentWindow, browser.width, isLogo);
                        FdCache.remove(snapshot, "preview");
                        FdCache.save(snapshot, preview, "preview");
                    }
                    var image = FdSnapshot.createImage(
                                       browser.contentWindow, options.thumbWidth, isLogo);
                    FdCache.remove(snapshot);
                    FdCache.save(snapshot, image);
                    browser.close();
                    Fd.updateView();
                },
                timeout);
    }
}
FdSnapshot.TIMEOUT_ULTRAFAST = 100;
FdSnapshot.TIMEOUT_MEDIUM = 5000;
FdSnapshot.create = function(properties) {
    var thumbnail = new FdThumbnail(properties);
    new FdSnapshot(thumbnail);
};
FdSnapshot.createImage = function(wnd, imageWidth, isLogo) {
    var doc = wnd.document;
    var width = doc.documentElement.offsetWidth;
    var height = FdThumbnail.getHeight(width);
    var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = imageWidth;
    canvas.height = FdThumbnail.getHeight(canvas.width);
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
};
