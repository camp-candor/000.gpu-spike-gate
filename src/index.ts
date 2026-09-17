import { dateUtils, dayjs, numeric } from './utils/index.js'

export type HelloWorld = number | string
export const helloThere: string = 'i am new'

export const sampleFunc = (value: HelloWorld): HelloWorld => {
    const __firs = dayjs('10-31-2004').isValid()
    const _result = dateUtils.isValidDate('10-31-2004', 'MM-DD-YYYY')
    const semver = numeric.isNumeric('1')
    console.log('sampleFunc:: ', value, semver, _result, __firs)
    return value
}

export const main = (): void => {
    sampleFunc('internal app initialized')
}

// Execute when run as main entry point
if (
    process.argv[1] &&
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
) {
    main()
}
