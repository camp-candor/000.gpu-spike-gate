import { describe, expect, test } from 'vitest'
import { dateUtils, numeric } from './utils/index.js'
import { main, sampleFunc } from './index.js'

describe('unit | utilities and sampleFunc', () => {
    test('numeric.isNumeric identifies numbers correctly', () => {
        expect(numeric.isNumeric('1')).toBe(true)
        expect(numeric.isNumeric(42)).toBe(true)
        expect(numeric.isNumeric('abc')).toBe(false)
    })

    test('dateUtils.isValidDate validates date strings', () => {
        expect(dateUtils.isValidDate('10-31-2004', 'MM-DD-YYYY')).toBe(true)
        expect(dateUtils.isValidDate('invalid-date')).toBe(false)
    })

    test('sampleFunc returns passed value', () => {
        expect(sampleFunc('test')).toBe('test')
    })

    test('main executes without errors', () => {
        expect(() => main()).not.toThrow()
    })
})
