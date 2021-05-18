// define some constants
{
    Size:{
        B: 1,
        KB: self.B*1024,
        MB: self.KB*1024,
        GB: self.MB*1024,
    },
    Duration:{
        Nanosecond: 1,
        Microsecond: 1000 * self.Nanosecond,
        Millisecond: 1000 * self.Microsecond,
        Second: 1000 * self.Millisecond,
        Minute: 60 * self.Second,
        Hour: 60 * self.Minute,
        Day: 24 * self.Hour,
    },
    Method: {
        HMD5: 'HMD5',
        HS1: 'HS1',
        HS256: 'HS256',
        HS384: 'HS384',
        HS512: 'HS512',
    },
    Coder: {
        GOB: 'GOB',
        JSON: 'JSON',
        XML: 'XML',
    },
    Provider: {
        Memory: 'Memory',
        Redis: 'Redis',
        Bolt: 'Bolt',
    },
    Level:{
        Debug: 'debug',
        Info: 'info',
        Warn: 'warn',
        Error: 'error',
        Dpanic: 'dpanic',
        Panic: 'panic',
        Fatal: 'fatal',
    },
}