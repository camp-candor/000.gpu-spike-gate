import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

dayjs.extend(customParseFormat)

export const dateUtils = {
    isValidDate: (dateStr: string, format?: string): boolean => {
        if (!dateStr) return false
        if (format) {
            return dayjs(dateStr, format, true).isValid()
        }
        return dayjs(dateStr).isValid()
    },
}

export const numeric = {
    isNumeric: (value: unknown): boolean => {
        if (typeof value === 'number') {
            return !Number.isNaN(value) && Number.isFinite(value)
        }
        if (typeof value !== 'string') {
            return false
        }
        const trimmed = value.trim()
        if (trimmed === '') return false
        return !Number.isNaN(Number(trimmed))
    },
}

export { dayjs }
