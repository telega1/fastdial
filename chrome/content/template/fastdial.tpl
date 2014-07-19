<table id="layout">
    <tr>
        <td>
            <div id="search">
                <% for(var i in this.search) { %>
                    <% var engine = FdUtils.getSearchEngine(this.search[i]); %>
                    <% if (engine) { %>
                        <% var icon = engine.iconURI ? engine.iconURI.spec : "chrome://fastdial/skin/icons/fastdial.png"; %>
                        <img class="search-icon" src="<%= icon %>">
                        <input class="search-input" type="text">
                    <% } %>
                <% } %>
            </div>
        </td>
    </tr>
    <tr>
        <td>
            <table id="grid">
                <% for(var i = 0; i < this.options.width * this.options.height; i++) { %>
                    <% if (i % this.options.width == 0) { %> <tr> <% } %>
                    <td>
                        <% var thumbnail = this.thumbnails[i]; %>
                        <div id="<%= i %>" class="box <%= !thumbnail ? "empty" : "" %>"
                                                title="<%= thumbnail && thumbnail.getTooltip() || "" %>">
                            <div class="thumbnail">
                                <% if (!thumbnail) { %>
                                    <div class="title"></div>
                                <% } else { %>
                                    <div class="buttons">
                                        <div class="button remove"></div>
                                        <div class="button refresh"></div>
                                        <div class="button properties"></div>
                                    </div>
                                    <a href="<%= thumbnail.getURL() %>">
                                        <% var isBack = thumbnail.properties.isBack; %>
                                        <% if (isBack || thumbnail.isLoading()) { %>
                                            <div class="background <%= isBack ? "back" : ""  %>"></div>                                        <% } else { %>
                                            <div class="body">
                                                <img class="image" src="<%= thumbnail.getImageURL() %>">
                                            </div>
                                        <% } %>
                                    </a>
                                    <div class="title">
                                        <div>
                                            <span><%= thumbnail.properties.title || "" %></span>
                                        </div>
                                    </div>
                                <% } %>
                            </div>
                        </div>
                    </td>
                    <% if ((i + 1) % this.options.width == 0) { %> </tr> <% } %>
                <% } %>
            </table>
        </td>
    </tr>
</table>
