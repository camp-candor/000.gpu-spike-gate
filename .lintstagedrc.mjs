export default {
    '*.{ts,tsx,js,mjs,cjs}': ['prettier --write', 'eslint --fix'],
    '*.json': ['prettier --write'],
    '*.md': (staged) => {
        const filtered = staged.filter((f) => !f.endsWith('.api.md'))
        if (filtered.length === 0) return []
        const files = filtered.map((f) => `"${f}"`).join(' ')
        return [
            `npm exec -- prettier --write ${files}`,
            `npm exec -- markdownlint-cli2 --no-globs --fix ${files}`,
        ]
    },
}
