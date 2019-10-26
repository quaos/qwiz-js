"use strict";

const events = require("events");
//const util = require("util");
const QUtils = require("./qwiz-utils");
const QTextUtils  = require("./qwiz-text-utils");

module.exports = (function(_namespace) {
    const WebViewLibs = {};

    class WebView {
        constructor(props) {
            this.document = null;
            this.window = null;
            this.jQuery = null;
            this.baseURL = null;
            this.model = {};
            this.selectors = {
                head: "head",
                body: "body",
                loading: ".loading",
                mainContainer: ".main-container",
                mainHeader: ".main-header,header",
                mainContent: ".main-content",
                mainFooter: ".main-footer,footer",
                errorMessages: ".error-messages",
                imports: 'head link[rel="import"]',
                templates: "template",
                styles: 'head link[rel="stylesheet"]'
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
            this.flags = {
                canImport: false,
                canUseTemplate: false
            };
            this.dataKeys = {
                importsPrefix: "importPrefix",
                importName: "importName",
                templatesPrefix: "tmplPrefix",
                tmplName: "tmplName",
                stylesPrefix: "cssPrefix",
                styleName: "cssName"
            };
            this.queryKeys = {
            };
            this.defaultSubPage = null;
            (props) && QUtils.merge(this, props, { deep: true });
            events.EventEmitter.call(this);
        }

        initOnReady() {
            const view = this;
            const doc = this.document;
            const j$ = this.jQuery;
            if (!doc) {
                return Promise.reject(new Error("No Document object available"));
            }

            return new Promise((resolve, reject) => {
                function onReady(evt) {
                    view.init().then(resolve).catch(reject);
                }
                if (typeof doc.addEventListener === "function") {
                    doc.addEventListener("DOMContentLoaded", onReady);
                } else if (j$) {
                    j$(doc).ready(onReady);
                } else {
                    reject(new Error("No document.addEventListener or jQuery library available"));
                }
            });
        }
        init(domEvt) {
            const _static = WebView;
            const view = this;
            const doc = this.document;

            return this.initAllStages(domEvt)
                .then((subResults) => {
                    view.onInitCompleted(subResults);
                    return Promise.resolve(true);
                })
                .catch((err) => {
                    view.onError(err);
                    return Promise.resolve(false);
                });
        }
        initAllStages(domEvt) {
            const view = this;
            console.log("Initializing WebView: ", domEvt);
            this.query = this.getQuery();
            //const subResults = [];
            this.flags.canImport = this.isHtmlImportSupported();
            this.flags.canUseTemplate = this.isHtmlTemplateSupported();

            return QUtils.chainPromises([
                this.initComponents.bind(this),
                (this.flags.canImport) ? this.initImports.bind(this) : false,
                (this.flags.canUseTemplate) ? this.initTemplates.bind(this) : false,
                this.initStyles.bind(this)
            ], domEvt);
        }
        initComponents() {
            const view = this;
            const doc = this.document;

            QUtils.forEachField(this.selectors, (k, v) => {
                view.comps[k] = doc.querySelectorAll(v);
            });

            this.initSingularComponents(["head", "body", "mainContainer", "mainHeader", "mainContent", "mainFooter", "errorMessages"]);
            console.log("Found page components: ", this.comps);

            return Promise.resolve(true);
        }
        initSingularComponents(keys) {
            for (let k of keys) {
                const comp = this.comps[k];
                if ((comp) && ((Array.isArray(comp) || (comp instanceof global.NodeList))))
                {
                    this.comps[k] = (comp.length >= 1) ? comp[0] : null;
                }
            }
        }
        initImports() {
            const _static = WebView;
            const view = this;
            const doc = this.document;

            if ((!this.comps.imports) || (this.comps.imports.length < 1)) {
                return Promise.resolve(true);
            }

            //TODO: Revise this later
            //const impPrefix = this.getImportsPrefix();
            const proms = [];
            for (let i = 0;i < this.comps.imports.length;i++) {
                const impNode = this.comps.imports[i];
                proms.push(this.waitForImport(impNode, { })
                    .catch((err) => {
                        view.onError(err);
                        return Promise.resolve(false);
                    })
                );
            }

            return Promise.all(proms);
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
                    const tmplName = tmplNode.dataset.tmplName || tmplNode.id;
                    this.checkRegisterTemplate(tmplName, tmplNode);
                    if (tmplName) {
                        this.stylesMap[tmplName] = tmplNode.content;
                    } else {
                        //TODO: Revise warning system
                        console.warn("Template Node has no name, id nor href for mapping: ", tmplNode);
                    }
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
                const styleName = styleNode.dataset[this.dataKeys.styleName]
                    || styleNode.id
                    || styleNode.href;
                this.checkRegisterStyle(styleName, styleNode);
            }

            return Promise.resolve(true);
        }

        getURL(path, query) {
            return QTextUtils.getURL(this.baseURL, path, query);
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

        isHtmlImportSupported() {
            return ("import" in this.document.createElement("link"));
        }
        getImportsPrefix() {
            const key = this.dataKeys.importsPrefix;
            if ((!key) && (key !== 0)) {
                return null;
            }

            return ((this.comps.head) ? this.comps.head.dataset[this.dataKeys.importsPrefix] : null)
                || ((this.comps.body) ?(this.comps.body.dataset[this.dataKeys.importsPrefix]) : null);
        }
        createImport(src, opts) {
            const view = this;
            const doc = this.document;
            if (!this.flags.canImport) {
                return Promise.reject(new Error("HTML5 Import not supported in current document"));
            }
            opts = opts || {};

            const linkNode = doc.createElement("link");
            linkNode.rel = "import";
            linkNode.href = src;
            ((opts.id) || (opts.id === 0)) && (linkNode.id = opts.id);
            (opts.dataset) && QUtils.merge(linkNode.dataset, opts.dataset);
            ((opts.name) || (opts.name === 0)) && (linkNode.dataset[this.dataKeys.importName] = opts.name);
            const prom = this.waitForImport(linkNode, {
                importPrefix: opts.importPrefix || this.getImportsPrefix(),
                tmplPrefix: opts.tmplPrefix || linkNode.dataset[this.dataKeys.tmplPrefix],
                stylesPrefix: opts.stylesPrefix || linkNode.dataset[this.dataKeys.stylesPrefix]
            });
            if (view.comps.head) {
                view.comps.head.appendChild(linkNode);
            } else {
                doc.head.appendChild(linkNode);
            }

            return prom;
        }
        waitForImport(linkNode, opts) {
            const view = this;
            opts = opts || {};

            return new Promise((resolve, reject) => {
                if (linkNode.import) {
                    view.onDocumentImported(linkNode, opts);
                    return resolve(linkNode.import);
                }
                linkNode.onload = function (evt) {
                    view.onDocumentImported(linkNode, opts);
                    resolve(linkNode.import);
                };
                linkNode.onerror = function (err) {
                    reject(err);
                };
            });
        }
        checkRegisterImport(name, linkNode) {
            if (name) {
                this.importsMap[name] = linkNode.import;
            } else {
                //TODO: Revise warning system
                console.warn("Link/Import Node has no name nor id for mapping: ", linkNode);
            }
        }
        applyImport(src, destContainer, opts) {
            const view = this;
            const doc = this.document;
            opts = opts || {};

            if (typeof src === "string") {
                src = this.importsMap[src];
            }
            if (!src) {
                throw new Error(`Source Import [${src}] not found`);
            }
            let srcNode = ((opts.selector)
                ? src.querySelector(opts.selector)
                : src.querySelector("body"))
                || src;
            if (!srcNode) {
                throw new Error("Source import selector/element not found");
            }

            destContainer.innerHTML = "";
            //TODO: Revise this later
            //const destDoc = destContainer.document || doc;
            let destNode = doc.importNode(srcNode, true);
            (opts.render) && (destNode = opts.render(destNode));

            destContainer.appendChild(destNode);
        }

        isHtmlTemplateSupported() {
            return ("content" in this.document.createElement("template"));
        }
        createTemplate(src, html, opts) {
            const view = this;
            const doc = this.document;
            if (!this.flags.canUseTemplate) {
                return Promise.resolve(false);
            }
            opts = opts || {};

            const tmplNode = doc.createElement("template");
            tmplNode.content.innerHTML = html;
            tmplNode.id = opts.id;
            const tmplName = opts.name || opts.id;
            const fullName = ((opts.prefix) || (opts.prefix === 0))
                ? `${opts.prefix}${tmplName}`
                : tmplName;
            tmplNode.dataset[this.dataKeys.tmplName] = fullName;
            this.checkRegisterTemplate(fullName, tmplNode);

            return tmplNode;
        }
        checkRegisterTemplate(tmplName, tmplNode) {
            if (tmplName) {
                this.templatesMap[tmplName] = tmplNode.content;
            } else {
                //TODO: Revise warning system
                console.warn("Template Node has no name nor id for mapping: ", tmplNode);
            }
        }
        applyTemplate(src, destContainer, opts) {
            const view = this;
            const doc = this.document;
            opts = opts || {};

            if (typeof src === "string") {
                src = this.templatesMap[src];
            } else if (src.content) {
                src = src.content;
            }
            if (!src) {
                throw new Error(`Source template [${src}] not found`);
            }

            destContainer.innerHTML = "";
            /*if (!src.content) {
                //throw new Error
                console.warn("Source template has no content");
                return false;
            }*/

            //TODO: Revise this later
            //const destDoc = destContainer.document || doc;
            let destNode = doc.importNode(src, true);
            (opts.render) && (destNode = opts.render(destNode));

            destContainer.appendChild(destNode);
        }
        renderTemplateNode(tmplNode, data) {
          const view = this;

          QUtils.walkObject(tmplNode, {
            onBeforeWalkDown: function (ctx) {
              return (!!this.children) && (!("outerHTML" in this)) && (!("innerHTML" in this)) && (!("innerText" in this));
            },
            onDefault: function (val1, ctx) {
              if ((val1) && (typeof val1 === "object") && (val1 instanceof global.Node)) {
                //TODO: Revise this later
                if (("outerHTML" in val1) && (val1.parentNode) && (val1.parentNode instanceof global.Element)) {
                    val1.outerHTML = QTextUtils.renderTemplate(val1.outerHTML, data);
                } else {
                    if ("innerHTML" in val1) {
                        val1.innerHTML = QTextUtils.renderTemplate(val1.innerHTML, data);
                    } else if ("innerText" in val1) {
                        val1.innerText = QTextUtils.renderTemplate(val1.innerText, data);
                    }
                    /*else if ((val1 instanceof global.TextNode) || (val1 instanceof global.CDATASection)) {
                        //Use innerText above
                    }*/
                    const attrNames = (typeof val1.getAttributeNames === "function") ? val1.getAttributeNames() : null;
                    (attrNames) && attrNames.forEach((aName) => {
                        let aVal = val1.getAttribute(aName);
                        ((aVal) || (aVal === 0))
                            && (aVal = QTextUtils.renderTemplate(aVal, data));
                        val1.setAttribute(aName, aVal);
                    });
                }
              }
            }
          });

          return tmplNode;
        }

        checkRegisterStyle(styleName, styleNode) {
            if (styleName) {
                this.stylesMap[styleName] = styleNode;
            } else {
                //TODO: Revise warning system
                console.warn("Style Node has no name, id nor href for mapping: ", styleNode);
            }
        }
        applyStyles(src, destContainer, opts) {
            const view = this;
            const doc = this.document;
            opts = opts || {};

            if (typeof src === "string") {
                src = this.stylesMap[src];
            }
            if (!src) {
                throw new Error(`Source style [${src}] not found`);
            }

            //TODO: Revise this later
            //const destDoc = destContainer.document || doc;
            let destNode = doc.importNode(src, true);
            (opts.render) && (destNode = opts.render(destNode));

            destContainer.appendChild(destNode);
        }

        setModel(model) {
            //TODO:
            const modelDiff = {
                added: {},
                modified: {},
                deleted: {}
            };
            //QUtils.merge(this.model, model, { deep: true });
            QUtils.walkObject(this.model, {
                target: model,
                onDefault: (val1, ctx) => {
                    const fullPath = ctx.path.concat([ ctx.key ]).join(".");
                    if (typeof ctx.target[ctx.key] === undefined) {
                        modelDiff.added[fullPath] = val1;
                        ctx.target[ctx.key] = val1;
                    } else if (ctx.isLeaf) {
                        modelDiff.modified[fullPath] = val1;
                        ctx.target[ctx.key] = val1;
                    }
                }
                //TODO:
            });
            QUtils.walkObject(this.model, {
                target: model,
                onDefault: (val1, ctx) => {
                    const fullPath = ctx.path.concat([ ctx.key ]).join(".");
                    if (typeof ctx.target[ctx.key] === undefined) {
                        modelDiff.deleted[fullPath] = val1;
                        ctx.currentObject[ctx.key] = undefined;
                    }
                }
                //TODO:
            });
            console.log("Model changed: ", modelDiff);
        }

        onInitCompleted(subResults) {
            const _static = WebView;

            (this.comps.loading) && this.comps.loading.forEach((node) => {
                node.style.display = "none";
            });

            this.emit(_static.EVT_INIT_COMPLETE, subResults);
        }

        onDocumentImported(linkNode, opts) {
            const _static = WebView;
            const view = this;
            opts = opts || {};

            const linksPrefix = opts.prefix || this.getImportsPrefix();
            const linkName = opts.name
                || ((this.dataKeys.importName) ? linkNode.dataset[this.dataKeys.importName] : null)
                || linkNode.id || linkNode.href;
            const linkFullName = ((linksPrefix) || (linksPrefix === 0))
                ? `${linksPrefix}${linkName}`
                : linkName;
            this.checkRegisterImport(linkFullName, linkNode);
            const tmplPrefix = opts.tmplPrefix
                || ((this.dataKeys.templatesPrefix) ? linkNode.dataset[this.dataKeys.templatesPrefix] : null);
            const tmplNodes = linkNode.import.querySelectorAll(this.selectors.template || "template");
            if (tmplNodes) {
                for (let i = 0;i < tmplNodes.length;i++) {
                    const tmplName = ((this.dataKeys.tmplName)
                        ? tmplNodes[i].dataset[this.dataKeys.tmplName]
                        : null)
                        || tmplNodes[i].id;
                    const fullName = ((tmplPrefix) || (tmplPrefix === 0))
                        ? `${tmplPrefix}${tmplName}`
                        : tmplName;
                    this.checkRegisterTemplate(fullName, tmplNodes[i]);
                }
            }
            const stylesPrefix = opts.stylesPrefix || linkNode.dataset[this.dataKeys.stylesPrefix];
            const styleNodes = linkNode.import.querySelectorAll(this.selectors.styles || 'link[rel="stylesheet"]');
            if (styleNodes) {
                for (let i = 0;i < styleNodes.length;i++) {
                    const styleName = ((this.dataKeys.styleName)
                        ? styleNodes[i].dataset[this.dataKeys.styleName]
                        : null)
                        || styleNodes[i].id || styleNodes[i].href;
                    const fullName = ((stylesPrefix) || (stylesPrefix === 0))
                        ? `${stylesPrefix}${styleName}`
                        : styleName;
                    this.checkRegisterStyle(fullName, styleNodes[i]);
                }
            }
            
            view.emit(_static.EVT_DOC_IMPORTED, linkNode);
        }

        onWarning(err) {
            const _static = WebView;
            const win = this.window;

            if (!err.handled) {
                console.warn(err);
                if (this.comps.errorMessages) {
                    this.comps.errorMessages.innerHTML = err.message;
                    this.comps.errorMessages.classList.add("warning");
                }
                err.handled = true;
            }
            this.emit(_static.EVT_ERROR, err);
        }
        onError(err) {
            const _static = WebView;
            const win = this.window;

            if (!err.handled) {
                console.error(err);
                if (this.comps.errorMessages) {
                    this.comps.errorMessages.innerHTML = err.message;
                    this.comps.errorMessages.classList.add("error");
                }
                (win) && win.alert(`ERROR: ${(err) ? err.message : null}`);
                err.handled = true;
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
            this.useContentFrame = (typeof this.useContentFrame !== "undefined") ? this.useContentFrame : false;
            this.defaultLanguage = (typeof this.defaultLanguage !== "undefined") ? this.defaultLanguage : "en";
            this.selectors.sidebar = (typeof this.selectors.sidebar !== "undefined")
                ? this.selectors.sidebar
                : ".sidebar-container";
            this.selectors.mainHeader = (typeof this.selectors.mainHeader !== "undefined")
                ? this.selectors.mainHeader
                : ".main-header";
            this.selectors.mainContentFrame = (typeof this.selectors.mainContentFrame !== "undefined")
                ? this.selectors.mainContentFrame
                : "iframe.content-frame";
            this.selectors.mainContentWrapper = (typeof this.selectors.mainContentWrapper !== "undefined")
                ? this.selectors.mainContentWrapper
                : ".main-content-wrapper";
            this.selectors.subPageContent = (typeof this.selectors.subPageContent !== "undefined")
                ? this.selectors.subPageContent
                : ".main-content";
            this.selectors.mainFooter = (typeof this.selectors.mainFooter !== "undefined")
                ? this.selectors.mainFooter
                : ".main-footer";
            this.queryKeys.lang = (typeof this.queryKeys.lang !== "undefined") ? this.queryKeys.lang : "lang";
            this.queryKeys.subPage = (typeof this.queryKeys.subPage !== "undefined") ? this.queryKeys.subPage : "subPage";
            this.routePath = (typeof this.routePath !== "undefined") ? this.routePath : `pages/\${lang}/\${subPage}.html`;
        }
            
        init(domEvt) {
            const view = this;

            return this.initAllStages(domEvt)
                .then((subResults) => {
                    view.onInitCompleted(subResults);
                    return Promise.resolve(true);
                })
                .catch((err) => {
                    view.onError(err);
                    return Promise.resolve(false);
                });
        }
        initAllStages(domEvt) {
            const view = this;
            const doc = this.document;
            let subResults;

            return super.initAllStages(domEvt)
                .then((subResults1) => {
                    subResults = subResults1 || [];
                    view.initSingularComponents(["sidebar", "mainContentFrame", "mainContentWrapper" ]);

                    return QUtils.chainPromises([
                        (view.useSidebar) ? view.initSidebar.bind(view) : true,
                        (view.comps.mainHeader) ? view.initHeader.bind(view) : true,
                        (view.useContentFrame) ? view.initContentFrame.bind(view) : true,
                        (view.comps.mainFooter) ? view.initFooter.bind(view) : true,
                        () => {
                            const subPage = ((view.queryKeys.subPage)
                                ? view.query[view.queryKeys.subPage]
                                : null)
                                || view.defaultSubPage;
        
                            return (subPage)
                                ? view.loadSubPage(subPage)
                                : Promise.resolve(false);
                        }
                    ], domEvt);
                });
        }
        initSidebar() {
            const view = this;

            if (!this.comps.sidebar) {
                console.warn("Sidebar component not found in WebView instance");
                return false;
            }
            const sidebarTmpl = this.templatesMap.sidebar;
            const sidebarLinkTmpl = this.templatesMap["sidebar-link"];
            (sidebarTmpl) && this.applyTemplate(sidebarTmpl, this.comps.sidebar, {
                render: (sidebarNode) => view.renderSidebarLinks(sidebarNode, view.model.sidebar, {
                    linkTemplate: sidebarLinkTmpl
                })
            });

            /*
            this.comps.sidebarLinks = this.comps.sidebar.querySelectorAll("ul li a");
            (this.comps.sidebarLinks) && this.comps.sidebarLinks.forEach((node) => {
                node.addEventListener("click", (evt) => view.onSidebarLinkClicked(evt, node));
            });
            */

            return this;
        }
        initHeader() {
            const view = this;
            const headerTmpl = this.templatesMap.header;
            (headerTmpl) && this.applyTemplate(headerTmpl, this.comps.mainHeader, {
                render: (node) => view.renderTemplateNode(node, view.model.header)
            });
        }
        initFooter() {
            const view = this;
            const footerTmpl = this.templatesMap.footer;
            (footerTmpl) && this.applyTemplate(footerTmpl, this.comps.mainFooter, {
                render: (node) => view.renderTemplateNode(node, view.model.footer)
            });
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
                console.log("Content Frame loaded: ", frameWin.location.href);
                view.setSidebarLinksEnabled(true);
            });
            frameWin.addEventListener("error", function (err) {
                console.error("Content Frame loading error: ", err);
                view.setSidebarLinksEnabled(true);
            });

            win.addEventListener("resize", (evt) => view.onWindowResized(evt));
            this.onWindowResized({ source: view, target: win, currentTarget: win });

            //let query = this.getQuery();
            //let subPage = query[this.subPageQueryKey];
            //this.loadSubPage(subPage);
        }

        renderSidebarLinks(sidebarNode, data, opts) {
            const view = this;
            const doc = this.document;
            const win = this.window;

            opts = opts || {};
            const linkTmpl = opts.linkTemplate
              || `<a href="\${url}" class="\${classes}">\${title}</a>`;
            const currentPageURL = win.location.href;
            /*
            if ((sidebarNode instanceof HTMLDocument)
                || (sidebarNode instanceof HTMLDocumentFragment)
                || (sidebarNode instanceof HTMLElement))
            {
                let sidebarTmpl = sidebarNode.innerHTML;
            }
            */
            let ulNode = sidebarNode.querySelector("ul");
            if (!ulNode) {
                ulNode = doc.createElement("ul");
                sidebarNode.appendChild(ulNode);
            }
            ulNode.innerHTML = "";
            (data) && data.forEach((item) => {
                item.active = false;
                const linkTmplCopy = doc.importNode(linkTmpl, true);
                const itemNode = view.renderTemplateNode(linkTmplCopy, item);
                //doc.createElement("li");
                //const aNode = view.renderTemplateNode(linkTmpl, item);
                const liNode = itemNode.querySelector("li");
                const aNode = itemNode.querySelector("a");
                if (aNode) {
                    if (aNode.href === currentPageURL) {
                        item.active = true;
                        (liNode) && liNode.classList.add("active");
                        aNode.classList.add("active");
                    }
                }
                ulNode.appendChild(itemNode);
            });

            return sidebarNode;
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
            const view = this;
            const doc = this.document;
            const lang = this.query[this.queryKeys.lang] || this.defaultLanguage;
            let subPageURL = QTextUtils.renderTemplate(this.routePath, {
                lang: lang,
                subPage: name
            });

            if (this.useContentFrame) {
                if ((!name) && (name !== 0)) {
                    this.comps.mainContentFrame.src = null;
                    return false;
                }
                
                const frame = this.comps.mainContentFrame;
                const frameWin = frame.contentWindow;
                frameWin.chakritw = frameWin.chakritw || {};
                frameWin.chakritw.qwiz = frameWin.chakritw.qwiz || {};
                frameWin.chakritw.qwiz.web = frameWin.chakritw.qwiz.web || {};
                frameWin.chakritw.qwiz.web.indexView = view;
                console.log(`Loading subpage [${name}] from: ${subPageURL} into content frame: `, frame);

                return new Promise((resolve, reject) => {
                    function onLoad(evt) {
                        console.log(evt);
                        clearEvents();
                        resolve(true);
                    }
                    function onError(err) {
                        clearEvents();
                        reject(err);
                    }
                    function clearEvents() {
                        frameWin.events.removeEventListener("load", onLoad);
                        frameWin.events.removeEventListener("error", onError);
                    }
                    frameWin.addEventListener("load", onLoad);
                    frameWin.addEventListener("error", onError);
                    frame.src = subPageURL;
                });
            }
            
            if ((!name) && (name !== 0)) {
                return false;
            }
            console.log(`Loading subpage [${name}] for [${lang}] into document from: ${subPageURL}`);
            const impDoc1 = this.importsMap[name];

            return (impDoc1) ? Promise.resolve(impDoc1) : this.createImport(subPageURL, { name: name })
                .then((impDoc) => {
                    let subPageNode = ((view.selectors.subPageContent)
                        ? impDoc.querySelector(view.selectors.subPageContent)
                        : null)
                        || impDoc.body;
                    view.applyImport(subPageNode, this.comps.mainContentWrapper, {
                        selector: view.selectors.subPageContent,
                        render: (node) => view.renderTemplateNode(node, view.model.subPage, { })
                    });

                    return Promise.resolve(true);
                });
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
            if (this.useContentFrame) {
                this.comps.mainContentFrame.width = refW - sidebarW;
                this.comps.mainContentFrame.height = refH - headerH - footerH;
            } else {
                this.comps.mainContent.width = refW - sidebarW;
                this.comps.mainContent.height = refH - headerH - footerH;
            }
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
