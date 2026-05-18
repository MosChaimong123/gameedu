export type WordImportErrorCode = "LEGACY_DOC" | "CORRUPT_DOCX" | "UNSUPPORTED";

export class WordImportError extends Error {
    readonly code: WordImportErrorCode;

    constructor(code: WordImportErrorCode) {
        super(code);
        this.name = "WordImportError";
        this.code = code;
    }
}

export const WORD_IMPORT_ERROR_TRANSLATION_KEYS: Record<WordImportErrorCode, string> = {
    LEGACY_DOC: "wordLegacyDocHint",
    CORRUPT_DOCX: "wordCorruptDocxHint",
    UNSUPPORTED: "pleaseUploadWordFile",
};

export function isZipParseErrorMessage(message: string): boolean {
    return /central directory|is this a zip file/i.test(message);
}
