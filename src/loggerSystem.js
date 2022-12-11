import * as u from '@virtuoso.dev/urx';
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
const CONSOLE_METHOD_MAP = {
    [LogLevel.DEBUG]: 'debug',
    [LogLevel.INFO]: 'log',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error',
};
const getGlobalThis = () => (typeof globalThis === 'undefined' ? window : globalThis);
export const loggerSystem = u.system(() => {
    const logLevel = u.statefulStream(LogLevel.ERROR);
    const log = u.statefulStream((label, message, level = LogLevel.INFO) => {
        const currentLevel = getGlobalThis()['VIRTUOSO_LOG_LEVEL'] ?? u.getValue(logLevel);
        if (level >= currentLevel) {
            // eslint-disable-next-line no-console
            console[CONSOLE_METHOD_MAP[level]]('%creact-virtuoso: %c%s %o', 'color: #0253b3; font-weight: bold', 'color: initial', label, message);
        }
    });
    return {
        log,
        logLevel,
    };
}, [], { singleton: true });
//# sourceMappingURL=loggerSystem.js.map