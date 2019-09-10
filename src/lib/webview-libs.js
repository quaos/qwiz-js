
import events from "events";
import util from "util";
import QUtils from "./qwiz-utils";
import QTextUtils from "./qwiz-text-utils";

//DEPRECATED:
/*
var global = global || window;
global.ChakritQ = global.ChakritQ || {};
//global.ChakritQ.utils = global.ChakritQ.utils || {};
//global.ChakritQ.WebViewUtils = global.ChakritQ.WebViewUtils || {};
//const QUtils = global.ChakritQ.utils;
*/

export default (function(_namespace) {
    const WebViewLibs = {};

    class WebView {
        constructor(props) {
            this.document = null;
            this.window = null;
            this.jQuery = null;
            this.baseURL = null;
            this.selectors = {
                head: "head",
                body: "body",
                loading: ".loading",
                mainContainer: ".main-container",
                mainHeader: ".main-header,header",
                mainContent: ".main-content",
                mainFooter: ".main-footer,footer",
                imports: 'link[rel="import"]',
                templates: "template",
                styles: 'link[rel="stylesheet"]'
            };
            this.comps = {
                head: null,
                body: null,
                mainContainer: null,
                mainHeader: null,
                mainContent: null,
                mainFooter: null,
                imports: null,
                templates: null,
                styles: null
            };
            this.importsMap = {
            };
            this.templatesMap = {
            };
            this.stylesMap = {
            };
            this.templatesPrefixDataKey = "qwiz-tmpl-prefix";
            this.stylesPrefixDataKey = "qwiz-css-prefix";
            (props) && QUtils.merge(this, props, { deep: true });
            events.EventEmitter.call(this);
        }

        initOnReady() {
            (this.document) && this.document.addEventListener("DOMContentLoaded", this.init.bind(this));

            return this;
        }
        init(domEvt) {
            const _static = WebView;
            const view = this;
            const doc = this.document;

            console.log("Initializing WebView: ", domEvt);
            const subResults = [];

            return this.initComponents()
                .then((result) => {
                    subResults.push(result);
                    return view.initImports();
                })
                .then((result) => {
                    subResults.push(result);
                    return view.initTemplates();
                })
                .then((result) => {
                    subResults.push(result);
                    return view.initStyles();
                })
                .then((result) => {
                    subResults.push(result);

                    (view.comps.loading) && view.comps.loading.forEach((node) => {
                        node.style.display = "none";
                    });

                    view.emit(_static.EVT_INIT_COMPLETE, subResults);

                    return Promise.resolve(true);
                })
                .catch((err) => {
                    view.onError(err);
                    return Promise.resolve(false);
                });
        }
        initComponents() {
            const view = this;
            const doc = this.document;

            QUtils.forEachField(this.selectors, (k, v) => {
                view.comps[k] = doc.querySelectorAll(v);
            });

            for (let k of ["head", "body", "mainContainer", "mainHeader", "mainContent", "mainFooter"]) {
                view.comps[k] = ((view.comps[k]) && (view.comps[k].length >= 1))
                    ? view.comps[k][0]
                    : null;
            }
            console.log("Found page components: ", this.comps);

            return Promise.resolve(true);
        }
        initImports() {
            const _static = WebView;
            const view = this;

            if ((!this.comps.imports) || (this.comps.imports.length < 1)) {
                return Promise.resolve(true);
            }

            //TODO: Revise this later
            //const proms = [];
            for (let i = 0;i < this.comps.imports.length;i++) {
                const impNode = this.comps.imports[i];
                if (impNode.import) {
                    view.importsMap[impNode.href] = impNode.import;
                    const tmplPrefix = impNode.dataset[view.templatesPrefixDataKey];
                    const stylesPrefix = impNode.dataset[view.stylesPrefixDataKey];
                    const tmplNodes = impNode.import.querySelectorAll(this.selectors.template || "template");
                    if (tmplNodes) {
                        for (let j = 0;j < tmplNodes.length;j++) {
                            let key = ((tmplPrefix) || (tmplPrefix === 0))
                                ? `${tmplPrefix}${tmplNodes[j].id}`
                                : tmplNodes[j].id;
                            view.templatesMap[key] = tmplNodes[j].content;
                        }
                    }
                    const styleNodes = impNode.import.querySelectorAll(this.selectors.styles || 'link[rel="stylesheet"]');
                    if (styleNodes) {
                        for (let j = 0;j < styleNodes.length;j++) {
                            let key = ((stylesPrefix) || (stylesPrefix === 0))
                                ? `${stylesPrefix}${styleNodes[j].id}`
                                : styleNodes[j].id;
                            view.stylesMap[key] = styleNodes[j].content;
                        }
                    }
                    
                    view.emit(_static.EVT_DOC_IMPORTED, impNode);
                }
            }

            return Promise.resolve(true);
        }
        initTemplates() {
            if ((!this.comps.templates) || (this.comps.templates.length < 1)) {
                return Promise.resolve(true);
            }

            //TODO: Revise this later
            //const proms = [];
            for (let i = 0;i < this.comps.templates.length;i++) {
                const tmplNode = this.comps.templates[i];
                if (tmplNode.content) {
                    this.templatesMap[tmplNode.id] = tmplNode.content;
                }
            }

            return Promise.resolve(true);
        }
        initStyles() {
            if ((!this.comps.styles) || (this.comps.styles.length < 1)) {
                return Promise.resolve(true);
            }

            //TODO: Revise this later
            //const proms = [];
            for (let i = 0;i < this.comps.styles.length;i++) {
                const styleNode = this.comps.styles[i];
                (styleNode.href) && (this.stylesMap[styleNode.href] = styleNode);
            }

            return Promise.resolve(true);
        }

        getURL(path, query) {
            return QTextUtils.getURL(this.baseURL, path, query)
        }

        getQuery() {
            const win = this.window;
            const queryString = win.location.search;

            return QTextUtils.getQuery(queryString);
        }

        getFormData(formNode, target) {
            target = target || {};

            const inputFlds = formNode.querySelectorAll("input,select");
            (inputFlds) && inputFlds.forEach((node) => {
                let val;
                if (node.tagName === "select") {
                    let val = [];
                    let optNodes = node.querySelectorAll("option");
                    optNodes.forEach((optNode) => {
                        if (optNode.hasAttribute("selected")) {
                            val.push(optNode.getAttribute("value"));
                        }
                    });
                } else {
                    let name = node.getAttribute("name");
                    let val = node.value;
                    if ((!name) && (name !== 0)) {
                        return false;
                    }
                    let inputType = node.getAttribute("type");
                    if (inputType === "checkbox")
                    {
                        let val1 = target[name];
                        if (!val1) {
                            target[name] = val1 = [];
                        }
                        if (node.hasAttribute("checked")) {
                            val1.push(val);
                        }
                    } else if (inputType === "radio") {
                        let val1 = target[name];
                        if (node.hasAttribute("checked")) {
                            target[name] = val1 = val;
                        }
                    } else {
                        target[name] = val;
                    }
                }
            });

            return target;
        }

        applyImport(src, destContainer, opts) {
            const view = this;
            const doc = this.document;
            opts = opts || {};

            if (typeof src === "string") {
                src = this.importsMap[src];
            }
            if (!src) {
                throw new Error("Source import not found");
            }
            let srcNode = (opts.srcSelector)
                ? src.querySelector(opts.srcSelector)
                : src.querySelector("body");
            if (!srcNode) {
                throw new Error("Source import selector/element not found");
            }

            destContainer.innerHTML = "";
            let destNode = destContainer.document.importNode(srcNode, true);
            (opts.processor) && (destNode = opts.processor(destNode));

            destContainer.appendChild(destNode);
        }
        applyTemplate(src, destContainer, opts) {
            const view = this;
            const doc = this.document;
            opts = opts || {};

            if (typeof src === "string") {
                src = this.templatesMap[src];
            }
            if (!src) {
                throw new Error("Source template not found");
            }

            destContainer.innerHTML = "";
            if (!src.content) {
                //throw new Error
                console.warn("Source template has no content");
                return false;
            }

            let destNode = destContainer.document.importNode(src.content, true);
            (opts.processor) && (destNode = opts.processor(destNode));

            destContainer.appendChild(destNode);
        }

        onError(err) {
            const _static = WebView;
            const win = this.window;

            if (!err.handled) {
                err.handled = true;
                console.error(err);
                win.alert(`ERROR: ${(err) ? err.message : null}`);
            }
            this.emit(_static.EVT_ERROR, err);
        }
    }
    QUtils.attachExtension(WebView, events.EventEmitter);
    QUtils.merge(WebView, {
        //statics
        EVT_INIT_COMPLETE: "init-complete",
        EVT_ERROR: "error",
        EVT_DOC_IMPORTED: "doc-imported"
    });
    WebViewLibs.WebView = WebView;

    class IndexView extends WebView {
        constructor(props) {
            super(props);
            //Default values
            this.useSidebar = (typeof this.useSidebar !== "undefined") ? this.useSidebar : true;
            this.useContentFrame = (typeof this.useContentFrame !== "undefined") ? this.useContentFrame : true;
            this.selectors.sidebar = (typeof this.selectors.sidebar !== "undefined") ? this.selectors.sidebar : ".sidebar";
            this.selectors.mainContentFrame = (typeof this.selectors.mainContentFrame !== "undefined")
                ? this.selectors.mainContentFrame
                : "iframe.content-frame";
            this.subPageQueryKey = (typeof this.subPageQueryKey !== "undefined") ? this.subPageQueryKey : "subPage";
            this.subPageBaseURL = (typeof this.subPageBaseURL !== "undefined") ? this.subPageBaseURL : "pages";
        }
            
        init(domEvt) {
            const view = this;
            const doc = this.document;
            
            return super.init(domEvt)
                .then(() => {
                    for (let k of ["sidebar", "mainContentFrame"]) {
                        view.comps[k] = ((view.comps[k]) && (view.comps[k].length >= 1))
                            ? view.comps[k][0]
                            : null;
                    }
                    if (view.useSidebar) {
                        view.initSidebar();
                    }
                    if (view.useContentFrame) {
                        view.initContentFrame();
                    }

                    return Promise.resolve(true);
                });
        }
        initSidebar() {
            const view = this;

            if (!this.comps.sidebar) {
                console.warn("Sidebar component not found in WebView instance");
                return false;
            }

            this.comps.sidebarLinks = this.comps.sidebar.querySelectorAll("ul li a");
            (this.comps.sidebarLinks) && this.comps.sidebarLinks.forEach((node) => {
                node.addEventListener("click", (evt) => view.onSidebarLinkClicked(evt, node));
            });

            return this;
        }
        initContentFrame() {
            const view = this;
            const win = this.window;
            
            if (!this.comps.mainContentFrame) {
                console.warn("Content Frame component not found in WebView instance");
                return false;
            }

            const frameWin = this.comps.mainContentFrame.contentWindow;
            frameWin.addEventListener("load", function (evt) {
                console.log("Subpage loaded: ", name);
                view.setSidebarLinksEnabled(true);
            });
            frameWin.addEventListener("error", function (err) {
                console.error("Subpage load error: ", err);
                view.setSidebarLinksEnabled(true);
            });

            win.addEventListener("resize", (evt) => view.onWindowResized(evt));
            this.onWindowResized({ source: view, target: win, currentTarget: win });

            let query = this.getQuery();
            let subPage = query[this.subPageQueryKey];
            this.loadSubPage(subPage);
        }

        setSidebarLinksEnabled(en) {
            this.comps.sidebarLinks.forEach((node) => {
                if (en) {
                    node.removeAttribute("disabled");
                } else {
                    node.setAttribute("disabled", "disabled");
                }
            });
        }
        
        loadSubPage(name) {
            if ((!name) && (name !== 0)) {
                this.comps.mainContentFrame.src = null;
                return false;
            }
            console.log("Loading subpage: ", name);
            this.comps.mainContentFrame.src = QTextUtils.getURL(this.subPageBaseURL, [ `${name}.html` ]);

            return true;
        }

        onWindowResized(evt) {
            console.log("Window resize event: ", evt);
            let refW = this.comps.body.clientWidth;
            let sidebarW = (this.comps.sidebar)
                ? this.comps.sidebar.offsetWidth
                : 0;
            let refH = this.comps.body.clientHeight;
            let headerH = (this.comps.mainHeader)
                ? this.comps.mainHeader.offsetHeight
                : 0;
            let footerH = (this.comps.mainFooter)
                ? this.comps.mainFooter.offsetHeight
                : 0; 
            this.comps.mainContentFrame.width = refW - sidebarW;
            this.comps.mainContentFrame.height = refH - headerH - footerH;
            (this.comps.sidebar) && (this.comps.sidebar.height = refH);

            return true;
        }

        onSidebarLinkClicked(evt, node) {
            const view = this;
            node = node || evt.currentTarget;

            if (node.hasAttribute("disabled")) {
                evt.stopImmediatePropagation();
                evt.preventDefault();
                return false;
            }
            if (node.dataset.subPage) {
                view.setSidebarLinksEnabled(false);
                view.loadSubPage(node.dataset.subPage);
                evt.stopImmediatePropagation();
                evt.preventDefault();
                return false;
            }

            return true;
        }
    }
    WebViewLibs.IndexView = IndexView;

    (_namespace) && QUtils.merge(_namespace, WebViewLibs);

    return WebViewLibs;
})( /*global.chakritw.utils*/ );
