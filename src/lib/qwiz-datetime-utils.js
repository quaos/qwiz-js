"use strict";

import Intl from "intl";
import QUtils from "./qwiz-utils";
import QTextUtils from "./qwiz-text-utils";

//DEPRECATED
//Namespaces
/*
var global = global || window;
global.chakritw = global.chakritw || {};
global.chakritw.qwiz = global.chakritw.qwiz || {};
global.chakritw.qwiz.utils = global.chakritw.qwiz.utils || {};
*/

export default (function(_namespace) {
    const QDateUtils = {
        CENTURY_BASE: 1900,
        //ISO_DATE_PATTERN: /^(\d{4}(-\d{2}(-\d{2})?)?)$/,
        ISO_DATETIME_PATTERN: /^((\d{4})(-(\d{2})(-(\d{2}))?)?)(T((\d{2})(:(\d{2})(:(\d{2})(\.(\d{1,3}))?)?)?)(Z|([+|-]{1})((\d{1,2})(:?(\d{1,2}))?)))?$/,
        ISO_DATETIME_GROUPS_MAP: [
            [2, "yyyy"],
            [4, "mm"],
            [6, "dd"],
            [9, "HH"],
            [11, "MM"],
            [13, "SS"],
            [15, "sss"],
            [16, "TZ"],
            [17, "TzSign"],
            [19, "TzHrs"],
            [21, "TzMins"]
        ],
        ISO_TIMEZONE_PATTERN: /^(Z|([+|-]{1})((\d{1,2})(:?(\d{1,2}))?))$/,
        ISO_TIMEZONE_GROUPS_MAP: [
            [1, "TZ"],
            [2, "TzSign"],
            [4, "TzHrs"],
            [6, "TzMins"]
        ],
        Granularities: {
            YEARS: "YEARS",
            MONTHS: "MONTHS",
            DAYS: "DAYS",
            HOURS: "HOURS",
            MINUTES: "MINUTES",
            SECONDS: "SECONDS",
            MILLISECS: "MILLISECS"
        }
    };
    QDateUtils.monthNamesByLocaleMap = {};
    QDateUtils.SHORT_MONTH_NAMES_MAP = [];
    
    //Date-time util classes&functions
    
    class LocalCalendar {
        static get(id, props) {
            let cal = ((id) || (id === 0)) ? LocalCalendar.CalendarsMap[id] : null;
            if (!cal) {
                props = props || {};
                props.id = id;
                cal = new LocalCalendar(props);
            }

            return cal;
        }

        constructor(props) {
            this.id = null;
            this.localeCode = null;
            this.name = null;
            this.timeZoneOffset = 0;
            this.era = LocalCalendar.CHRISTIANS_ERA;
            this.daysInWeek = 7;
            this.monthsInYear = 12;
            (props) && QUtils.merge(this, props, { deep: true });
            (!this.localeCode) && (this.localeCode !== 0) && (this.localeCode = this.id || "default");
            this.dowNames = new Array(this.daysInWeek);
            this.shortDowNames = new Array(this.daysInWeek);
            this.monthNames = new Array(this.monthsInYear);
            this.shortMonthNames = new Array(this.monthsInYear);
            
            this._dowFmt = new Intl.DateTimeFormat(this.localeCode, { weekday: "long" });
            this._sDowFmt = new Intl.DateTimeFormat(this.localeCode, { weekday: "short" });
            for (let dow = 0;dow < this.daysInWeek;dow++) {
                let t = new Date();
                t = new Date(t.setDate(t.getDate() - t.getDay() + dow));
                this.dowNames[dow] = this._dowFmt.format(t);
                this.shortDowNames[dow] = this._sDowFmt.format(t);
            }

            this._monFmt = new Intl.DateTimeFormat(this.localeCode, { month: "long" });
            this._sMonFmt = new Intl.DateTimeFormat(this.localeCode, { month: "short" });
            for (let m = 0;m < this.monthsInYear;m++) {
                let t = new Date(new Date().setMonth(m));
                this.monthNames[m] = this._monFmt.format(t);
                this.shortMonthNames[m] = this._sMonFmt.format(t);
            }
            this._fullFmt = new Intl.DateTimeFormat(this.localeCode);

            ((this.id) || (this.id === 0))
                && (LocalCalendar.CalendarsMap[this.id] = this);
        }

        parse(s, pattern, opts) {
            opts = opts || {};
            const era = opts.era || this.era;
            const pattern2 = pattern.replace(/(yyyy|yy|mmmm|mmm|mm|m|dd|d|HH|H|MM|M|SS|S|sss|s|Z)/g, "$${$1}");
            
            const flds = QTextUtils.parseTextFields(s, pattern2, { });
            const flds2 = {
                yyyy: flds.yyyy,
                mm: flds.mm,
                dd: flds.dd,
                HH: flds.HH,
                MM: flds.MM,
                SS: flds.SS,
                sss: flds.sss,
                Z: flds.Z
            };
            if ((flds.yy) || (flds.yy === 0)) {
                flds2.yyyy = flds.yy + QDateUtils.CENTURY_BASE;
            }
            if ((flds.mmm) || (flds.mmmm)) {
                if (flds.mmmm) {
                    flds2.mm = this.monthNames.indexOf(flds.mmmm) + 1;
                } else {
                    flds2.mm = this.shortMonthNames.indexOf(flds.mmm) + 1;
                }
            } else if ((flds.m) || (flds.m === 0)) {
                flds2.mm = flds.m;
            }
            if ((flds.d) || (flds.d === 0)) {
                flds2.dd = flds.d;
            }
            if ((flds.H) || (flds.H === 0)) {
                flds2.HH = flds.H;
            }
            if ((flds.M) || (flds.M === 0)) {
                flds2.MM = flds.M;
            }
            if ((flds.S) || (flds.S === 0)) {
                flds2.SS = flds.S;
            }
            if ((flds.ss) || (flds.ss === 0)) {
                flds2.sss = flds.ss;
            } else if ((flds.s) || (flds.s === 0)) {
                flds2.sss = flds.s;
            } 
    
            let t = new Date(flds2.yyyy || QDateUtils.CENTURY_BASE,
                ((flds2.mm) || (flds2.mm === 0)) ? flds2.mm - 1 : 0,
                ((flds2.dd) || (flds2.dd === 0)) ? flds2.dd : 1,
                flds2.HH || 0, flds2.MM || 0, flds2.SS || 0, flds2.sss || 0);
            //TODO: Revise this later
            let localTzOffs = -t.getTimezoneOffset();
            let tzOffs = ((flds2.Z) || (flds2.Z === 0))
                ? parseTimeZoneOffset(flds2.Z)
                : (((opts.timeZoneOffset) || (opts.timeZoneOffset === 0))
                    ? opts.timeZoneOffset
                    : this.timeZoneOffset);
            if ((tzOffs) || (tzOffs === 0)) {
                t = new Date(t.setUTCMinutes(t.getUTCMinutes() - tzOffs + localTzOffs));
                t.forTimeZone = tzOffs;
            }
            t = checkCorrectEra(t, era);
            t.granularity = getGranularity(flds2);

            return t;
        }

        format(t, pattern, opts) {
            opts = opts || {};
            const tzOffs = ((opts.timeZoneOffset) || (opts.timeZoneOffset === 0))
                ? opts.timeZoneOffset
                : this.timeZoneOffset;
            const era = opts.era || this.era;
            let t2 = ((tzOffs) || (tzOffs === 0))
                ? new Date(t.setUTCMinutes(t.getUTCMinutes() + tzOffs))
                : t;
            t2 = checkCorrectEra(t2, era);
            if (!pattern) {
                return this._fullFmt.format(t2);
            }

            const pattern2 = pattern.replace(/(yyyy|yy|mmmm|mmm|mm|m|wwww|www|w|dd|d|HH|H|MM|M|SS|S|sss|s|Z)/g, "$${$1}");
            const dtFlds =  {
                yyyy: t2.getUTCFullYear(),
                yy: t2.getUTCYear(),
                m: t2.getUTCMonth() + 1,
                w: t2.getDay(),
                d: t2.getUTCDate(),
                H: t2.getUTCHours(),
                M: t2.getUTCMinutes(),
                S: t2.getUTCSeconds(),
                s: t2.getUTCMilliseconds()
            };
            dtFlds.mm = `0${dtFlds.m}`.slice(-2);
            dtFlds.www = this.shortDowNames[dtFlds.w];
            dtFlds.wwww = this.dowNames[dtFlds.w];
            dtFlds.mmm = this.shortMonthNames[dtFlds.m - 1];
            dtFlds.mmmm = this.monthNames[dtFlds.m - 1];
            dtFlds.dd = `0${dtFlds.d}`.slice(-2);
            dtFlds.HH = `0${dtFlds.H}`.slice(-2);
            dtFlds.MM = `0${dtFlds.M}`.slice(-2);
            dtFlds.S = `0${dtFlds.S}`.slice(-2);
            dtFlds.sss = `00${dtFlds.s}`.slice(-3);
            dtFlds.Z = `${(tzOffs >= 0) ? "+" : "-"}` + `000${Math.abs(tzOffs)}`.slice(-4);

            return QTextUtils.renderTemplate(pattern2, dtFlds);
        }
    }
    LocalCalendar.CalendarsMap = {};
    LocalCalendar.CHRISTIANS_ERA = "AD";
    LocalCalendar.BUDDHISTS_ERA = "BE";
    LocalCalendar.BE_THRESHOLD = 2500;
    LocalCalendar.BE_OFFSET = 543;

    class Duration {
        constructor(dt) {
            //this.years = 0;
            //this.months = 0;
            this.days = 0;
            this.rawHours = 0;
            this.hours = 0;
            this.minutes = 0;
            this.seconds = 0;
            this.millis = 0;
            this.rawMillis = 0;
            this.update(dt);
        } 
        
        update(dt) {
            if (typeof dt === "number") {
                this.rawMillis = this.millis = dt;
            } else {
                QUtils.merge(this, dt, { deep: true });
                this.recalculateRawMillis();
            }
            this.normalize();
            return this;
        }
        recalculateRawMillis() {
            this.rawMillis = (((this.days*24 + this.hours)*60 + this.minutes)*60 + this.seconds)*1000 + this.millis;
            return this;
        }
        normalize() {
            let x = this.millis;
            this.millis = x%1000;
            x = Math.round((x - this.millis)/1000);
            this.seconds = (this.seconds + x)%60;
            x = Math.round((x - this.seconds)/60);
            this.minutes = (this.minutes + x)%60;
            x = Math.round((x - this.minutes)/60);
            this.rawHours = this.hours + x;
            this.hours = this.rawHours%24;
            x = Math.round((x - this.hours)/24);
            this.days = this.days + x;

            return this;
        }
    }

    /**
     * @param {Date} dt 
     * @param {String} targetEra 
     * @param {Object} opts 
     */
    function checkCorrectEra(t, targetEra, opts) {
        opts = opts || {};
        targetEra = targetEra || checkCorrectEra.DEFAULT_ERA;
        let t2;
        let yyyy = t.getUTCFullYear();
        if (yyyy >= LocalCalendar.BE_THRESHOLD) {
            if (targetEra === LocalCalendar.CHRISTIANS_ERA) {
                yyyy -= LocalCalendar.BE_OFFSET;
            }
        } else {
            if (targetEra === LocalCalendar.BUDDHISTS_ERA) {
                yyyy += LocalCalendar.BE_OFFSET;
            }
        }
        t2 = new Date(t.setUTCFullYear(yyyy)); //new Date(t.getTime())
        QUtils.merge(t2, {
            forTimeZone: t.forTimeZone,
            granularity: t.granularity
        });

        return t2;
    }
    checkCorrectEra.DEFAULT_ERA = LocalCalendar.CHRISTIANS_ERA;

    function getGranularity(flds) {
        let gran = null;

        for (let k of ["yyyy","mm","dd","HH", "MM", "SS", "sss"]) {
            let fld = flds[k];
            if ((!fld) && (fld !== 0)) {
                break;
            }
            gran = getGranularity.FLDS_MAP[k];
        }

        return gran;
    }
    getGranularity.FLDS_MAP = {
        "yyyy": QDateUtils.Granularities.YEARS,
        "mm": QDateUtils.Granularities.MONTHS,
        "dd": QDateUtils.Granularities.DAYS,
        "HH": QDateUtils.Granularities.HOURS,
        "MM": QDateUtils.Granularities.MINUTES,
        "SS": QDateUtils.Granularities.SECONDS,
        "sss": QDateUtils.Granularities.MILLISECS
    };

    function parseTimeZoneOffset(tz) {
        if ((!tz) && (tz !== 0)) {
            return null;
        }
        if (typeof tz === "number") {
            return tz;
        }
        const matches = QDateUtils.ISO_TIMEZONE_PATTERN.exec(tz);
        if (matches.length < 2) {
            return null;
        }

        const tzFlds = {};
        const n = QDateUtils.ISO_TIMEZONE_GROUPS_MAP.length;
        for (let i=0;i < n;i++) {
            let tuple = QDateUtils.ISO_TIMEZONE_GROUPS_MAP[i];
            let gID = tuple[0];
            let gName = tuple[1];
            if (gID >= matches.length) {
                break;
            }
            tzFlds[gName] = matches[gID];
        }

        return (tzFlds.TzHrs)
            ? ((tzFlds.TzSign === "-") ? -1 : 1)*(tzFlds.TzHrs*60 + (tzFlds.TzMins*1 || 0))
            : 0;
    }
    /*
    function isISODateString(s) {
        return QDateUtils.ISO_DATE_PATTERN.test(s);
    }
    */
    function isISODateTimeString(s) {
        return QDateUtils.ISO_DATETIME_PATTERN.test(s);
    }
    function parseISODateTime(src, opts) {
        opts = opts || {};

        const flds = {};
        const matches = QDateUtils.ISO_DATETIME_PATTERN.exec(src);
        if (matches.length < 3) {
            return null;
        }

        const n = QDateUtils.ISO_DATETIME_GROUPS_MAP.length;
        for (let i = 0;i < n;i++) {
            let tuple = QDateUtils.ISO_DATETIME_GROUPS_MAP[i];
            let gID = tuple[0];
            let gName = tuple[1];
            if (gID >= matches.length) {
                break;
            }
            let val = matches[gID];
            (typeof val !== "undefined") && (val !== null) && (!isNaN(val)) && (val = 1*val);
            flds[gName] = val;
        }
        
        let dt;
        dt = new Date(flds.yyyy, ((flds.mm) && (flds.mm >= 1)) ? flds.mm - 1 : 0, flds.dd || 1,
            flds.HH || 0, flds.MM || 0, flds.SS || 0, flds.sss || 0);
        //TODO: Revise this later
        let localTzOffs = -dt.getTimezoneOffset();
        let tzOffs = ((flds.TzHrs) || (flds.TzHrs === 0))
            ? ((flds.TzSign === "-") ? -1 : 1)*(flds.TzHrs*60 + (flds.TzMins || 0))
            : opts.timeZoneOffset;
        if ((tzOffs) || (tzOffs === 0)) {
            dt = new Date(dt.setUTCMinutes(dt.getUTCMinutes() - tzOffs + localTzOffs));
            dt.forTimeZone = tzOffs;
        }
        dt = checkCorrectEra(dt, LocalCalendar.CHRISTIANS_ERA);
        dt.granularity = getGranularity(flds);

        return dt;
    }

    function parseDateTime(src, opts) {
        opts = opts || {};
        if ((!src) && (src !== 0)) {
            return null;
        }
        if (src instanceof Date) {
            return src;
        }
        if (typeof src === "number") {
            return new Date(src);
        }
        if ((!opts.pattern) && (isISODateTimeString(src))) {
            return parseISODateTime(src, { });
        }
        const cal = LocalCalendar.get(opts.locale, {
            timeZoneOffset: opts.timeZoneOffset,
            era: opts.era
        });

        return cal.parse(src, opts.pattern || parseDateTime.DEFAULT_PATTERN, {
            timeZoneOffset: opts.timeZoneOffset,
            era: opts.era
        });
    }
    parseDateTime.DEFAULT_PATTERN = "yyyy-mm-dd HH:MM:SS.sss";

    function parseDateRange(from, to, opts) {
        opts = opts || {};
        let pattern = opts.pattern || parseDateTime.DEFAULT_PATTERN;

        let fromDT = parseDateTime(from, { pattern: pattern });
        let toDT = parseDateTime(to, { pattern: opts.pattern });
        const toTZ = toDT.forTimeZone;
        switch (toDT.granularity) {
            case QDateUtils.Granularities.YEARS:
                toDT = new Date(toDT.setUTCFullYear(toDT.getUTCFullYear() + 1));
                toDT.forTimeZone = toTZ;
                break;
            case QDateUtils.Granularities.MONTHS:
                toDT = new Date(toDT.setUTCMonth(toDT.getUTCMonth() + 1));
                toDT.forTimeZone = toTZ;
                break;
            case QDateUtils.Granularities.DAYS:
                toDT = new Date(toDT.setUTCDate(toDT.getUTCDate() + 1));
                toDT.forTimeZone = toTZ;
                break;
            case QDateUtils.Granularities.HOURS:
                toDT = new Date(toDT.setUTCHours(toDT.getUTCHours() + 1));
                toDT.forTimeZone = toTZ;
                break;
            default:
                break;
        }

        return [ fromDT, toDT ];
    }

    function formatDateTime(t, opts) {
        opts = opts || {};
        const pattern = opts.pattern || formatDateTime.DEFAULT_PATTERN;
        const cal = LocalCalendar.get(opts.locale, {
            timeZoneOffset: opts.timeZoneOffset,
            era: opts.era
        });
        
        return cal.format(t, pattern, {
            //TODO: Revise this later
            timeZoneOffset: ((opts.timeZoneOffset) || (opts.timeZoneOffset === 0))
                ? opts.timeZoneOffset
                : -dt.getTimezoneOffset()
        });
    }
    formatDateTime.DEFAULT_PATTERN = "yyyy-mm-dd HH:MM:SS.sss";

    function getDateDiff(t1, t2, opts) {
        opts = opts || {};
        
        let dt = t2.getTime() - t1.getTime();
        let duration = new Duration(dt);
        
        return duration;
    }
    
    function addDateOffset(t1, dt, opts) {
        opts = opts || {};
        let dt2 = (dt instanceof Duration)
            ? dt
            : new Duration(dt);
        let t2 = new Date(t1.getTime() + dt2.rawMillis);

        return t2;
    }
    
    QUtils.merge(QDateUtils, {
        LocalCalendar: LocalCalendar,
        Duration: Duration,
        checkCorrectEra: checkCorrectEra,
        parseDateTime: parseDateTime,
        parseDateRange: parseDateRange,
        formatDateTime: formatDateTime,
        getDateDiff: getDateDiff,
        addDateOffset: addDateOffset
    });

    (_namespace) && QUtils.merge(_namespace, QDateUtils);

    return QDateUtils;
})( /*global.chakritw.qwiz.utils.datetime*/ );
