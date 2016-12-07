function initialize() {
    var tree = document.getElementById("foldersTree");
    tree.place =
        "place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder=" +
        PlacesUIUtils.allBookmarksFolderId;
}

function onAccept() {
    var tree = document.getElementById("foldersTree");
    window.arguments[0].folderId = PlacesUtils.getConcreteItemId(tree.selectedNode);
}

function newFolder() {
    var tree = document.getElementById("foldersTree");
    let ip = tree.insertionPoint;
    let performed = PlacesUIUtils.showBookmarkDialog({ action: "add"
                           , type: "folder"
                           , defaultInsertionPoint: ip
                           , hiddenRows: [ "folderPicker" ]
                           }, window.top);
    if (performed) {
        let id = PlacesUtils.bookmarks.getIdForItemAt(ip.itemId, ip.index);            
        tree.selectItems([id], false);

        var item = fastdial.Storage.getItem(id);
        item.logo = fastdial.Prefs.getString("folderLogo");
        fastdial.Storage.saveItem(item);
    }
}
