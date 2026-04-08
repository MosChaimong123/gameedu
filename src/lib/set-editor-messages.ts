type CsvImportLanguage = "th" | "en";

const CSV_REQUIRED_COLUMNS = {
    en: ["Question Text", "Correct Answer"],
    th: ["คำถาม", "คำตอบที่ถูกต้อง"],
} as const;

export function getCsvRequiredColumns(language: CsvImportLanguage) {
    return CSV_REQUIRED_COLUMNS[language];
}

export function getCsvMissingColumnsMessage(
    language: CsvImportLanguage,
    template: string
) {
    return template.replace("{columns}", getCsvRequiredColumns(language).join(", "));
}

export function getCsvInvalidFileMessage(fallback: string) {
    return fallback;
}

export function getCsvNoValidQuestionsMessage(fallback: string) {
    return fallback;
}

export function getCsvParseErrorMessage(template: string, errorMessage: string) {
    return template.replace("{error}", errorMessage);
}
