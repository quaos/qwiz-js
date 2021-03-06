"use strict";

const debug = require("debug");

//Global namespaces
//DEPRECATED:
//var window = window || null;
//if (!window) {
//TODO: Revise this later
class _DummyNode{
  constructor(tagName) {
    this.tagName = tagName;
  }
}
if (!global.Node) {
    global.Node = _DummyNode;
}
class _DummyDocument {
  constructor() {
  }
  createElement(tagName) {
    return new _DummyNode(tagName);
  }
}
if (!global.Document) {
    global.Document = _DummyDocument;
}
class _DummyWindow {
    constructor() {
    }
}
if (!global.Window) {
    global.Window = _DummyWindow;
}
//DEPRECATED:
//var global = global || window;

module.exports = (function(_namespace) {
    const QUtils = {};
    const DEBUG_NS = "qwiz.utils";

    //Base util functions
    /**
     * forEachField: Simple iteration over object fields
     * @param {Object} obj
     * @param {Function<String, *>} callback
     * @param {Object} opts 
     */
    function forEachField (obj, callback, opts) {
        opts = opts || {};
        const protoLimit = opts.prototypeLimit || Object.prototype;
        const inclSet = new Set(opts.includesList);
        let exclList = [ "constructor", "__prototype__", "_class", "_super" ];
        (opts.excludesList) && (exclList = exclList.concat(opts.excludesList));
        const exclSet = new Set(exclList);

        function _next(k, v) {
            return callback(k, v);
        }
        if (Array.isArray(obj)) {
            let n = obj.length;
            for (let i = 0;i < n;i++) {
                let proceed = _next(i, obj[i]);
                if ((typeof proceed !== "undefined") && (!proceed)) {
                    break;
                }
            }
        } else {
            for (let key in obj) {
                if (exclSet.has(key)) {
                    continue;
                }
                if ((!Object.prototype.hasOwnProperty.call(obj, key)) && (!inclSet.has(key))) {
                    let foundInLimit = false;
                    let objProto = obj.__proto__
                        || ((obj.constructor) ? obj.constructor.prototype : null);
                    while ((objProto) && (typeof objProto === "object")) {
                        if (objProto === protoLimit) {
                            break;
                        }
                        if (Object.prototype.hasOwnProperty.call(objProto, key)) {
                            foundInLimit = true;
                            break;
                        }
                        const nextProto = objProto.__proto__
                            || ((objProto.constructor) ? objProto.constructor.prototype : null);
                        if ((nextProto === objProto)) {
                            break;
                        }
                        objProto = nextProto;
                    }
                    if (!foundInLimit) {
                        continue;
                    }
                }
                let proceed = _next(key, obj[key]);
                if ((typeof proceed !== "undefined") && (!proceed)) {
                    break;
                }
            }
        }

        return this;
    }
    function isFieldWritable(obj, key, opts) {
        opts = opts || {};
        const protoLimit = opts.prototypeLimit;
        if ((typeof obj[key] === "undefined") || (obj[key] === null)) {
            return true;
        }

        let propDesc;
        while (obj) {
          if (obj === protoLimit) {
            break;
          }
          propDesc = Object.getOwnPropertyDescriptor(obj, key);
          if (propDesc) {
            break;
          }
          const objProto = obj.__prototype__ || obj.constructor.prototype;
          if (objProto === obj) {
              break;
          }
          obj = objProto;
        }
        return (!propDesc) || (propDesc.writable);
    }

    /**
     * Get object property by path
     * @param {Object} obj
     * @param {String|Array} path
     */
    function getPropByPath(obj, path, opts) {
        opts = opts || {};
        const delim = opts.delimiter || getPropByPath.DEFAULT_DELIMITER;
        if (!Array.isArray(path)) {
            path = `${path}`.split(delim);
        }
        let prop = obj;
        let n = path.length;
        for (let i = 0;i < n;i++) {
            let key = path[i];
            let valid = (key) || (key === 0);
            valid = valid && (typeof prop !== "undefined") && (prop !== null);
            if (!valid) {
                if (i + 1 < n) {
                    prop = undefined;
                }
                break;
            }
            prop = prop[key];
        }

        return prop;
    }
    getPropByPath.DEFAULT_DELIMITER = ".";

    /**
     * Set object property by path
     * @param {Object} obj
     * @param {String|Array} path
     */
    function setPropByPath(obj, path, val, opts) {
        opts = opts || {};
        const delim = opts.delimiter || setPropByPath.DEFAULT_DELIMITER;
        if (!Array.isArray(path)) {
            path = `${path}`.split(delim);
        }
        let prop = obj;
        let n = path.length;
        for (let i = 0;i < n;i++) {
            let key = path[i];
            let last = (i + 1 >= n);
            let valid = (key) || (key === 0);
            valid = valid && (typeof prop !== "undefined") && (prop !== null);
            if (!valid) {
                if (!last) {
                    prop = undefined;
                }
                break;
            }
            if (last) {
                if ((Array.isArray(prop)) && (!isNaN(key))) {
                    while (prop.length <= key) {
                        prop.push(null);
                    }
                    prop.push(val);
                } else {
                    prop[key] = val;
                }
            } else {
                prop = prop[key];
            }
        }

        return prop;
    }
    setPropByPath.DEFAULT_DELIMITER = ".";

    /**
     * Creates object/array empty copy
     * @param {Object} src 
     */
    function createEmptyCopy(src) {
        if (!src) {
            return {};
        }
        let target;
        if (Array.isArray(src)) {
            target = []; //new Array(src.length);
        } else {
            const srcProto = src.__prototype__ || src.constructor.prototype;
            target = (srcProto) ? Object.create(srcProto) : {};
        }

        return target;
    }

    class ObjectIterationContext {
        /**
         * @param {Object} props
         */
        constructor(props) {
            const ctx = this;
            (props) && forEachField(props, (k, v) => {
                (typeof v !== "undefined") && (ctx[k] = v);
            });
            this.path = this.path || [];
            this.depth = this.depth || 0;
            this.isLeaf = this.isLeaf || false;
            this.isCircularRef = this.isCircularRef || false;
            this.isSpecialObject = this.isSpecialObject || false;
            this.stopped = this.stopped || false;
            this.seenObjs = (this.seenObjs instanceof Set)
                ? this.seenObjs
                : new Set(this.seenObjs);
            this.objectToTargetMappings = this.objectToTargetMappings || [];
        }
        
        setTargetValue(key, val) {
            if (Array.isArray(this.target)) {
                if (Array.isArray(val)) {
                    this.target = this.target.concat(val);
                } else {
                    //TODO: Revise this later
                    for (let i = 0;i < key - this.target.length;i++) {
                        this.target.push(null);
                    }
                    this.target.push(val);
                }
            } else {
                if (isFieldWritable(this.target, key, { })) {
                    this.target[key] = val;
                }
            }
    
            return this.target;
        }
        checkCreateTarget() {
            if (!this.target) {
                this.target = createEmptyCopy(this.currentObject);
                this.addTargetMapping(this.currentObject, this.target);
            }
    
            return this.target;
        }
        getMappedTarget(src) {
            if ((!src) || (typeof src !== "object")) {
                return null;
            }
            let target = null;
            this.objectToTargetMappings.forEach((entry) => {
                if (entry.src === src) {
                    target = entry.target;
                    //break
                    return false;
                }
            });
    
            return target;
        }
        addTargetMapping(src, target) {
            this.objectToTargetMappings.push({ src: src, target: target });
        }
    }
    
    /**
     * walkObject: Iteration through nested object tree to do expressions processing
     * @param {Object} obj 
     * @param {Object} opts 
     */
    function walkObject(obj, opts) {
        opts = opts || {};
        const beforeAllFn = (typeof opts.onBeforeAll === "function") ? opts.onBeforeAll : null;
        //const defaultCallback = (typeof opts.defaultCallback === "function") ? opts.defaultCallback : null;
        const afterAllFn = (typeof opts.onAfterAll === "function") ? opts.onAfterAll : null;
        const exprsMap = opts.expressionsMap || {};
        const defaultExpr = opts.onDefault;
        //const inclSet = new Set(opts.includesList);
        let exclList = [ "constructor", "__prototype__", "_class", "_super" ];
        (opts.excludesList) && (exclList = exclList.concat(opts.excludesList));
        const exclSet = new Set(exclList);
        const targetObj = opts.target; //|| obj;
        //const targetRefsMap = {};
        
        function _walkObjectInternal(_obj, ctx) {
            ctx = ctx || new ObjectIterationContext({
                rootObject: _obj,
                target: targetObj
            });
            try {
                //const _target = ctx.target;
                ctx.seenObjs.add(_obj);
                ctx.currentObject = _obj;
                //ctx.target = _checkCreateTarget(_obj, ctx.target);
                (ctx.depth <= 0) && (beforeAllFn) && beforeAllFn.call(_obj, ctx);

                const upperPathPrefix = (ctx.path.length >= 1) ? `${ctx.path.join(".")}.` : null;
                const subInclList = [];
                (opts.includesList) && opts.includesList.forEach((inclPath) => {
                    if (!upperPathPrefix) {
                        subInclList.push(inclPath);
                        return;
                    }
                    if (inclPath.startsWith(upperPathPrefix)) {
                        subInclList.push(inclPath.substring(upperPathPrefix.length));
                    }
                });
                forEachField(_obj,
                    (k, v) => {
                        ctx.isCircularRef = false;
                        ctx.isSpecialObject = false;
                        if (Array.isArray(_obj)) {
                            ctx.arrayIdx = k;
                        } else {
                            ctx.key = k;
                        }
                        //ctx.target = (_target) ? _target[k] : null;
                        let fullPath = ((ctx.key) || (ctx.key === 0))
                            ? ctx.path.concat([ctx.key])
                            : ctx.path;
                        let fullPathStr = fullPath.join(".") || "";
                        ctx.fullKey = fullPathStr;
                        if (exclSet.has(fullPathStr)) {
                            return true;
                        }
                        if ((typeof v === "object") && (v)) {
                            ctx.isLeaf = false;
                            if (ctx.seenObjs.has(v)) {
                                ctx.isCircularRef = true;
                            }
                            //Check for platform object & special objects to prevent Invocation Errors
                            if (((global.Node) && (v instanceof global.Node))
                                || ((global.NodeList) && (v instanceof global.NodeList))
                                || ((global.HTMLCollection) && (v instanceof global.HTMLCollection))
                                || ((global.Window) && (v instanceof global.Window))
                                || ((global.process) && (v === global.process)))
                            {
                                ctx.isSpecialObject = true;
                            }
                            if ((!ctx.isCircularRef) && (!ctx.isSpecialObject)
                                && ((typeof opts.maxDepth !== "number") || (ctx.depth < opts.maxDepth)))
                            {
                                //Go deep down
                                ctx.seenObjs.add(v);
                                const subCtx = new ObjectIterationContext({
                                    rootObject: ctx.rootObject,
                                    parent: ctx,
                                    path: fullPath,
                                    key: (Array.isArray(_obj)) ? k : null,
                                    depth: ctx.depth + 1,
                                    seenObjs: ctx.seenObjs,
                                    target: ((ctx.target) && (!Array.isArray(ctx.target)))
                                        ? ctx.target[k]
                                        : null,
                                    objectToTargetMappings: ctx.objectToTargetMappings,
                                    includesList: subInclList
                                });
                                let proceed = (opts.onBeforeWalkDown)
                                    ? opts.onBeforeWalkDown.call(v, ctx, subCtx)
                                    : true;
                                if ((typeof proceed === "undefined") || (proceed)) {
                                    _walkObjectInternal(v, subCtx);
                                    if (subCtx.stopped) {
                                        return false;
                                    }
                                    if (typeof subCtx.target !== "undefined") {
                                        ctx.checkCreateTarget();
                                        if (Array.isArray(ctx.target)) {
                                            ctx.target.push(subCtx.target);
                                        } else {
                                          if (isFieldWritable(ctx.target, k)) {
                                            ctx.target[k] = subCtx.target;
                                          }
                                        }
                                    }
                                }
                            }
                        } else {
                            ctx.isLeaf = true;
                        }

                        let expr = exprsMap[fullPathStr] || defaultExpr;
                        let result;
                        if (typeof expr === "function") {
                            result = expr.call(_obj, v, ctx);
                        } else {
                            result = expr;
                        }
                        //ctx.target = _target;
                        if (ctx.stopped) {
                            return false;
                        }
                        //TODO: Revise this
                        if (typeof result !== "undefined") {
                            ctx.checkCreateTarget();
                            if (Array.isArray(ctx.target)) {
                                ctx.target.push(result);
                            } else {
                                if (isFieldWritable(ctx.target, k)) {
                                  ctx.target[k] = result;
                                }
                            }
                        }
                        if (ctx.target) {
                            ctx.addTargetMapping(ctx.currentObject, ctx.target);
                        }
                        
                        return true;
                    },
                    {
                        prototypeLimit: opts.prototypeLimit,
                        includesList: subInclList
                    }
                );
            } catch (err) {
                (typeof opts.onError === "function") && opts.onError(err);
                ctx.lastError = err;
            }
            
            (ctx.depth <= 0) && (afterAllFn) && afterAllFn.call(_obj, ctx);
            if (ctx.lastError) {
                throw ctx.lastError;
            }

            return ctx.target;
        }
        return _walkObjectInternal(obj);
    }
    //TODO: Revise this later
    walkObject.Context = ObjectIterationContext;

    /**
     * merge: merge src object into dest object
     * @param {Object} dest 
     * @param {Object} src 
     * @param {Object} opts 
     * @param {ObjectIterationContext} ctx 
     */
    function merge (dest, src, opts /*, ctx*/) {
        opts = opts || {};
        const maxDepth = (opts.deep) ? opts.deep : 0;
        
        walkObject(src, {
            target: dest,
            maxDepth: maxDepth,
            includesList: opts.includesList,
            excludesList: opts.excludesList,
            prototypeLimit: opts.prototypeLimit,
            onBeforeWalkDown: function (ctx, subCtx) {
                //Check src type
                const val1 = this;
                if ((val1 instanceof Date)
                    || (ctx.isSpecialObject))
                {
                    ctx.isLeaf = true;
                    return false;
                }
                return true;
            },
            onDefault: function (val1, ctx) {
                //let obj1 = ctx.currentObject;
                //ctx.checkCreateTarget();
                let val2;
                if (ctx.target) {
                    val2 = (Array.isArray(ctx.target))
                        ? null
                        : (((ctx.key) || (ctx.key === 0)) ? ctx.target[ctx.key] : null);
                }

                //Check src and dest val
                let isLeaf = ctx.isLeaf;
                if (ctx.isCircularRef) {
                    isLeaf = true;
                    val2 = ctx.getMappedTarget(val1);
                    debug(DEBUG_NS)(`Replacing Circular Ref: (${ctx.fullKey},`, val1, ") => ", val2);
                } else if (((typeof opts.deep === "number") && (ctx.depth >= maxDepth)) || (!opts.deep)) {
                    isLeaf = true;
                    debug(DEBUG_NS)(`Replacing Out-Of-Depth: (${ctx.fullKey},`, ctx.fullKey, ",", val1, ") => ", val2);
                    val2 = val1;
                } else if (ctx.isSpecialObject) {
                    isLeaf = true;
                    val2 = val1;
                    debug(DEBUG_NS)(`Assigning Special Object: ${val2} into target`);
                } else if (val1 instanceof Date) {
                    isLeaf = true;
                    val2 = (opts.deep) ? new Date(val1.getTime()) : val1;
                } else if ((isLeaf) && (Array.isArray(val1)) && (val1)
                    && (Array.isArray(val2)) && (val2))
                {
                    debug(DEBUG_NS)(`Merging Array: (${ctx.fullKey},`, val1, " + ", val2 ,") into target");
                    val2 = val2.concat(val1);
                } else {
                    val2 = val1;
                }
                if (!isLeaf) {
                    return;
                }

                //Check target container
                ctx.checkCreateTarget();
                debug(DEBUG_NS)(`Merging: (${ctx.fullKey},`, val2, ") into => ", ctx.target);
                /*
                if (Array.isArray(ctx.target)) {
                    console.log(`Merging: (${ctx.fullKey},`, val2, ") into array => ", ctx.target);
                    ctx.target.push(val2);
                    val2 = undefined;
                } else {
                    console.log(`Merging: (${ctx.fullKey},`, val1, ") into => ", ctx.target);
                }
                */

                return val2;
            }
        });
    
        return this;
    }
    /**
     * clone: Creates a clone of src object
     * @param {Object} src 
     */
    function clone(src, opts) {
        opts = opts || {};
        let srcCls = src.constructor;
        let dest =  (srcCls) ? Object.create(srcCls) : {};
        (typeof opts === "undefined") && (opts.deep = true);
        QUtils.merge(dest, src, opts);

        return dest;
    }

    /**
     * cascade: Used to create cascading search function, for ex. to emulate CSS in React Native Stylesheets
     * @param {Array} layers
     * @param {Object} opts
     * @returns {Function<string>} query
     */
    function cascade(layers, opts) {
        opts = opts || {};

        function query(keyPath) {
            const ctx = {
                layers: layers,
                keyPath: keyPath,
                selected: null
            };
            (opts.onBefore) && opts.onBefore(ctx);
            const vals = layers.map((layer) => getPropByPath(layer, ctx.keyPath));
            (opts.onValues) && opts.onValues(vals, ctx);
            if ((typeof ctx.selected !== "undefined") && (ctx.selected !== null)) {
                return ctx.selected;
            }
            for (let val of vals) {
                if (typeof val !== "undefined") {
                    ctx.selected = val;
                    break;
                }
            }

            return ctx.selected;
        }
        query.toObject = (refObj) => {
            const target = {};
            if (!refObj) {
                refObj = {};
                layers.forEach((layer) => QUtils.merge(refObj, layer, { deep: true }));
            }
            QUtils.walkObject(refObj, {
                target: target,
                onDefault: (val1, ctx) => {
                    return query(ctx.fullKey);
                }
            });

            return target;
        };

        return query;
    }

    /**
     * chainPromises: Used to chain Promise-returning functions sequentially
     * @param {Array<Function|any>} fns 
     * @param {Array} params1
     * @returns {Array} results
     */
    function chainPromises(fns, ...params1) {
        const _this = this;
        const results = [];

        function next(i, _params) {
            if (i >= fns.length) {
                return Promise.resolve(results);
            }
            const fn = fns[i];
            let prom = (typeof fn === "function")
                ? fn.apply(_this, _params)
                : fn;
            ((!prom) || (typeof prom.then !== "function"))
                && (prom = Promise.resolve(prom));
            
            return prom
                .then((result) => {
                    results.push(result);

                    return next(i+1, [ result ]);
                });
        }

        return next(0, params1);
    }

    /**
     * extendClass: Used for extension of older ES constructor functions syntax
     * @param {Object} parent 
     * @param {Object} childProto 
     * @param {Object} childStatic 
     */
    function extendClass(parent, childProto, childStatic) {
        let childProto2 = Object.create(parent.prototype);
        let childCls = ((childProto) ? childProto.constructor : null) || function QWiz_auto_constructor () {
        };
        (childCls.prototype) && merge(childProto2, childCls.prototype, { deep: true });
        (childProto) && merge(childProto2, childProto, { deep: true });
        (childStatic) && merge(childCls, childStatic, { deep: true });
        childProto2.constructor = childCls;
        childCls.prototype = childProto2;
        childProto2._super=parent;
        childProto2.constructor._super = parent;

        return childProto2;
    }
    /**
     * attachExtension: Used for attaching extension class prototype & static properties to base class
     * @param {Function} cls 
     * @param {Function} extCls 
     */
    function attachExtension(cls, extCls) {
        if (!cls.prototype) {
            cls.prototype = { constructor: cls };
        }
        merge(cls.prototype, extCls.prototype);
        merge(cls, extCls, { deep: true });

        return cls.prototype;
    }
    
    /**
     * makeFactory: Maps or creates a factory function for a class
     * @param {Function} cls 
     * @param {Function} fac
     */
    function makeFactory(cls, fac) {
        if (!fac) {
            fac = function QWiz_auto_factory() {
                let instance = Object.create(cls.prototype);
                let _constructor = cls.prototype.constructor || cls;
                _constructor.apply(instance, arguments);
                return instance;
            };
        }
        merge(fac, cls);
        fac.prototype = cls.prototype;
        
        return fac;
    }

    merge(QUtils, {
        forEachField: forEachField,
        isFieldWritable: isFieldWritable,
        getPropByPath: getPropByPath,
        setPropByPath: setPropByPath,
        createEmptyCopy: createEmptyCopy,
        ObjectIterationContext: ObjectIterationContext,
        walkObject: walkObject,
        merge: merge,
        clone: clone,
        cascade: cascade,
        chainPromises: chainPromises,
        extendClass: extendClass,
        attachExtension: attachExtension,
        makeFactory: makeFactory
    });
    (_namespace) && merge(_namespace, QUtils);

    return QUtils;
})( /*global.chakritw.qwiz.utils*/ );
