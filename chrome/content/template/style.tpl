/**
* @title <%= this.title || "" %>
*/
<% for(var selector in this.style) { %>
<% var props = this.style[selector]; %>
<%= selector %> {
<% for(var name in props) { %>
<%= name %>: <%= props[name] %>;
<% } %>
}
<% } %>
