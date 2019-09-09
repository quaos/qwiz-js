
import assert from "assert";
import debug from "debug";
import util from "util";
import QUtils from "../src/lib/qwiz-utils";
import QDateUtils from "../src/lib/qwiz-datetime-utils";

describe("qwiz-datetime-utils", function () {
    const DEBUG_NS = "qwiz.utils.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(QDateUtils);
        assert.equal(typeof QDateUtils, "object");
        done();
    });

    it("Can check and correct era to AD: checkCorrectEra()", (done) => {
        assert.equal(typeof QDateUtils.checkCorrectEra, "function");

        const subCases = [
            { t: new Date(2499, 11, 31, 23, 59, 59, 999), expected: 2499 },
            { t: new Date(2500, 0, 1, 23, 30), toEra: QDateUtils.LocalCalendar.CHRISTIANS_ERA, expected: 1957 },
            { t: new Date(2500, 0, 2), expected: 1957 },
            { t: new Date(1999, 11, 31), toEra: QDateUtils.LocalCalendar.BUDDHISTS_ERA, expected: 2542 }
        ];
        let lastErr = null;
        subCases.forEach((subCase) => {
            if (lastErr) {
                return false;
            }
            let t2 = QDateUtils.checkCorrectEra(subCase.t, subCase.toEra);
            debug(DEBUG_NS)(`${subCase.t} => ${t2} ${subCase.toEra} <=> ${subCase.expected} (expected)`);
            try {
                assert.equal(t2.getFullYear(), subCase.expected);
            } catch (err) {
                lastErr = err;
            }
        });
        done(lastErr);
    }).timeout(TEST_TIMEOUT);

    describe("LocalCalendar", function () {
        let enCal;
        let thCal;

        it("Can create Local Calendar instance (en)", (done) => {
            assert.equal(typeof QDateUtils.LocalCalendar, "function");

            enCal = new QDateUtils.LocalCalendar({
                id: "en",
                localeCode: "en-US",
                era: QDateUtils.LocalCalendar.CHRISTIANS_ERA
            });
            debug(DEBUG_NS)(`${enCal.id} => ${util.inspect(enCal)}`);
            assert.ok(enCal);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can create Local Calendar instance (th)", (done) => {
            assert.equal(typeof QDateUtils.LocalCalendar, "function");

            thCal = new QDateUtils.LocalCalendar({
                id: "th",
                era: QDateUtils.LocalCalendar.BUDDHISTS_ERA
            });
            debug(DEBUG_NS)(`${thCal.id} => ${util.inspect(thCal)}`);
            assert.ok(thCal);
            done();
        }).timeout(TEST_TIMEOUT);
        
        it("Can parse date/time string: parse()", (done) => {
            assert.equal(typeof QDateUtils.LocalCalendar.prototype.parse, "function");
            assert.ok(enCal);
            assert.ok(thCal);
            
            const localTZ = -new Date().getTimezoneOffset();
            const subCases = [
                {
                    s: "2019-09-08 15:41:01.555 +0730", fmt: "yyyy-mm-dd HH:MM:SS.sss Z", locale: "en",
                    expected: {
                        year: 2019, month: 9, day: 8, hour: 8, minute: 11, second: 1, millisec: 555,
                        granularity: QDateUtils.Granularities.MILLISECS, tz: 450, calendar: enCal
                    }
                },
                {
                    s: "06.2562", fmt: "mm.yyyy", tz: 0, locale: "en",
                    expected: {
                        year: 2019, month: 6, day: 1, hour: 0, minute: 0, second: 0, millisec: 0, 
                        granularity: QDateUtils.Granularities.MONTHS, tz: 0, calendar: enCal
                    }
                },
                {
                    s: "Sep 8, 2019", fmt: "mmm d, yyyy", locale: "en", era: QDateUtils.LocalCalendar.BUDDHISTS_ERA, tz: 0,
                    expected: {
                        year: 2562, month: 9, day: 8, hour: 0, minute: 0, second: 0, millisec: 0, 
                        granularity: QDateUtils.Granularities.DAYS, tz: 0, calendar: enCal
                    }
                },
                {
                    s: "ตุลาคม 2562", fmt: "mmmm yyyy", locale: "th", era: QDateUtils.LocalCalendar.CHRISTIANS_ERA, tz: 420,
                    expected: {
                        year: 2019, month: 9, day: 30, hour: 17, minute: 0, second: 0, millisec: 0, 
                        granularity: QDateUtils.Granularities.MONTHS, tz: 420, calendar: thCal
                    }
                }
            ];
            let lastErr = null;
            subCases.forEach((subCase) => {
                if (lastErr) {
                    return false;
                }                
                try {
                    let cal = QDateUtils.LocalCalendar.get(subCase.locale);
                    debug(DEBUG_NS)(`${subCase.locale} => Found calendar: ${util.inspect(cal)}`);
                    assert.equal(cal, subCase.expected.calendar);
                    let t = subCase.t = cal.parse(subCase.s, subCase.fmt, { timeZoneOffset: subCase.tz, era: subCase.era });
                    debug(DEBUG_NS)(`${subCase.s} => ${t} ${t.granularity} <=> ${util.inspect(subCase.expected)} (expected)`);
                    assert.equal(t.getUTCFullYear(), subCase.expected.year);
                    assert.equal(t.getUTCMonth() + 1, subCase.expected.month);
                    assert.equal(t.getUTCDate(), subCase.expected.day);
                    assert.equal(t.getUTCHours(), subCase.expected.hour);
                    assert.equal(t.getUTCMinutes(), subCase.expected.minute);
                    assert.equal(t.getUTCSeconds(), subCase.expected.second);
                    assert.equal(t.getUTCMilliseconds(), subCase.expected.millisec);
                    assert.equal(t.forTimeZone, subCase.expected.tz);
                    assert.equal(t.granularity, subCase.expected.granularity);
                } catch (err) {
                    lastErr = err;
                }
            });
            done(lastErr);
        }).timeout(TEST_TIMEOUT);
    });

    it("Can parse ISO & Local date/time strings: parseDateTime()", (done) => {
        assert.equal(typeof QDateUtils.parseDateTime, "function");
        
        const localTZ = -new Date().getTimezoneOffset();
        const subCases = [
            {
                s: "2019-09-08T15:41:01.555+0730", locale: "en",
                expected: {
                    year: 2019, month: 9, day: 8, hour: 8, minute: 11, second: 1, millisec: 555,
                    granularity: QDateUtils.Granularities.MILLISECS, tz: 450
                }
            },
            {
                s: "2019-09-08T15:41+0730", locale: "en",
                expected: {
                    year: 2019, month: 9, day: 8, hour: 8, minute: 11, second: 0, millisec: 0,
                    granularity: QDateUtils.Granularities.MINUTES, tz: 450
                }
            },
            {
                s: "Sep 8, 2019", fmt: "mmm d, yyyy", locale: "en", era: QDateUtils.LocalCalendar.BUDDHISTS_ERA, tz: 0,
                expected: {
                    year: 2562, month: 9, day: 8, hour: 0, minute: 0, second: 0, millisec: 0, 
                    granularity: QDateUtils.Granularities.DAYS, tz: 0
                }
            },
            {
                s: "ตุลาคม 2562", fmt: "mmmm yyyy", locale: "th", era: QDateUtils.LocalCalendar.CHRISTIANS_ERA, tz: 420,
                expected: {
                    year: 2019, month: 9, day: 30, hour: 17, minute: 0, second: 0, millisec: 0, 
                    granularity: QDateUtils.Granularities.MONTHS, tz: 420
                }
            }
        ];
        let lastErr = null;
        subCases.forEach((subCase) => {
            if (lastErr) {
                return false;
            }                
            try {
                let t = subCase.t = QDateUtils.parseDateTime(subCase.s, {
                    locale: subCase.locale,
                    pattern: subCase.fmt, 
                    timeZoneOffset: subCase.tz,
                    era: subCase.era
                });
                debug(DEBUG_NS)(`${subCase.s} => ${t} ${t.granularity} <=> ${util.inspect(subCase.expected)} (expected)`);
                assert.equal(t.getUTCFullYear(), subCase.expected.year);
                assert.equal(t.getUTCMonth() + 1, subCase.expected.month);
                assert.equal(t.getUTCDate(), subCase.expected.day);
                assert.equal(t.getUTCHours(), subCase.expected.hour);
                assert.equal(t.getUTCMinutes(), subCase.expected.minute);
                assert.equal(t.getUTCSeconds(), subCase.expected.second);
                assert.equal(t.getUTCMilliseconds(), subCase.expected.millisec);
                assert.equal(t.forTimeZone, subCase.expected.tz);
                assert.equal(t.granularity, subCase.expected.granularity);
            } catch (err) {
                lastErr = err;
            }
        });
        done(lastErr);
    }).timeout(TEST_TIMEOUT);

    it("Can get dates difference: getDateDiff()", (done) => {
        assert.equal(typeof QDateUtils.getDateDiff, "function");

        const t1 = new Date(2019, 8, 6, 10, 0, 0);
        const t2 = new Date(2019, 8, 7, 9, 34, 0);
        const expected = (24*60 - (60 - 34))*60*1000;
        let dt = QDateUtils.getDateDiff(t1, t2);
        debug(DEBUG_NS)(`getDateDiff(): ${t2} - ${t1} => ${dt.rawMillis} <=> ${expected} (expected)`);
        assert.equal(dt.rawMillis, expected);
        done();
    }).timeout(TEST_TIMEOUT);
    
    it("Can add date offset: addDateOffset()", (done) => {
        assert.equal(typeof QDateUtils.addDateOffset, "function");

        const t1 = new Date(2019, 8, 6, 13, 0, 0);
        const dt = new QDateUtils.Duration({ hours: 1, seconds: 1, millis: 1029 });
        const expected = new Date(2019, 8, 6, 14, 0, 2, 29);
        let t2 = QDateUtils.addDateOffset(t1, dt);
        debug(DEBUG_NS)(`addDateOffset(): ${t1} + ${dt.rawMillis} => ${t2} <=> ${expected} (expected)`);
        assert.equal(t2.getFullYear(), expected.getFullYear());
        assert.equal(t2.getMonth(), expected.getMonth());
        assert.equal(t2.getDate(), expected.getDate());
        assert.equal(t2.getHours(), expected.getHours());
        assert.equal(t2.getMinutes(), expected.getMinutes());
        assert.equal(t2.getSeconds(), expected.getSeconds());
        assert.equal(t2.getMilliseconds(), expected.getMilliseconds());
        done();
    }).timeout(TEST_TIMEOUT);
    

});

