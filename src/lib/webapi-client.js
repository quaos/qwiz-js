
const QUtils = require("./qwiz-utils");

class WebApiClient {
    static register(name, impl) {
        WebApiClient.impls.push(impl);
        WebApiClient.implsMap[name] = impl;
    }
    /**
     * getInstance(name, opts) || getInstance(opts)
     * @param {string?} name 
     * @param {object?} opts 
     */
    static getInstance(name, opts) {
        if ((typeof name === "object") && (typeof opts === "undefined")) {
            opts = name;
            name = null;
        }
        let implCls;
        if (name) {
            implCls = WebApiClient.implsMap[name];
        } else {
            implCls = (WebApiClient.impls.length >= 1)
                ? WebApiClient.impls[0]
                : null;
        }

        return (typeof implCls === "function") ? new implCls(opts) : null;
    }

    login(method, credentials, opts) { throw new Error("Not Implemented"); }
    logout(method, opts) { throw new Error("Not Implemented"); }
    callAPI(method, path, reqData, opts) { throw new Error("Not Implemented"); }
}
QUtils.merge(WebApiClient, {
    //statics
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",

    EVT_LOGGED_IN: "logged-in",
    EVT_LOGGED_OUT: "logged-out",
    EVT_ERROR: "error",

    impls: [],
    implsMap: {}
});

module.exports = WebApiClient;
