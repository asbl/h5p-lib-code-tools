class RuntimeFactory {

    constructor(language) {

        this.language = language;
    }
    /**
     * Returns CodeMirror language extension based on question language
     */
    getLanguageExtension() {
        switch (this.question?.language) {
            case 'python': return python();
            case 'markdown': return markdown();
            case 'sql': return sql();
            default: return javascript();
        }
    }
}