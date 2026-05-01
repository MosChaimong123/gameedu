export type EconomyReconciliationStudent = {
    id: string;
    name: string;
    nickname?: string | null;
    gold: number;
};

export type EconomyReconciliationTransaction = {
    id: string;
    studentId: string;
    type: string;
    source: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    idempotencyKey?: string | null;
    createdAt: Date;
};

export type EconomyReconciliationIssueType =
    | "transaction_balance_mismatch"
    | "ledger_chain_gap"
    | "current_balance_mismatch"
    | "missing_ledger";

export type EconomyReconciliationIssue = {
    type: EconomyReconciliationIssueType;
    severity: "warning" | "error";
    transactionId?: string;
    expected: number | null;
    actual: number;
    previousBalance?: number;
    message: string;
};

export type EconomyReconciliationStudentReport = {
    studentId: string;
    name: string;
    nickname: string | null;
    currentGold: number;
    openingBalance: number | null;
    expectedGold: number | null;
    ledgerNet: number;
    transactionCount: number;
    firstTransactionAt: string | null;
    lastTransactionAt: string | null;
    status: "ok" | "warning" | "mismatch";
    issues: EconomyReconciliationIssue[];
};

export type EconomyReconciliationReport = {
    generatedAt: string;
    summary: {
        studentCount: number;
        okCount: number;
        warningCount: number;
        mismatchCount: number;
        issueCount: number;
        transactionCount: number;
        currentGoldTotal: number;
        expectedGoldTotal: number;
        unreconciledGoldTotal: number;
        byIssueType: Record<EconomyReconciliationIssueType, number>;
    };
    students: EconomyReconciliationStudentReport[];
};

function issueMessage(type: EconomyReconciliationIssueType): string {
    switch (type) {
        case "transaction_balance_mismatch":
            return "Transaction balanceAfter does not equal balanceBefore + amount.";
        case "ledger_chain_gap":
            return "Transaction balanceBefore does not continue from the previous ledger balance.";
        case "current_balance_mismatch":
            return "Student current gold does not match the latest ledger balance.";
        case "missing_ledger":
            return "Student has gold but no economy ledger rows in this classroom.";
    }
}

function compareTransactions(
    a: EconomyReconciliationTransaction,
    b: EconomyReconciliationTransaction
): number {
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
}

export function buildEconomyReconciliationReport(
    students: EconomyReconciliationStudent[],
    transactions: EconomyReconciliationTransaction[],
    now: Date = new Date()
): EconomyReconciliationReport {
    const byStudent = new Map<string, EconomyReconciliationTransaction[]>();
    for (const tx of transactions) {
        const list = byStudent.get(tx.studentId) ?? [];
        list.push(tx);
        byStudent.set(tx.studentId, list);
    }

    const reports = students.map((student): EconomyReconciliationStudentReport => {
        const rows = [...(byStudent.get(student.id) ?? [])].sort(compareTransactions);
        const issues: EconomyReconciliationIssue[] = [];
        let previousBalance: number | null = null;
        let openingBalance: number | null = null;
        let expectedGold: number | null = null;
        let ledgerNet = 0;

        for (const row of rows) {
            if (openingBalance === null) openingBalance = row.balanceBefore;
            ledgerNet += row.amount;

            const rowExpectedAfter = row.balanceBefore + row.amount;
            if (row.balanceAfter !== rowExpectedAfter) {
                issues.push({
                    type: "transaction_balance_mismatch",
                    severity: "error",
                    transactionId: row.id,
                    expected: rowExpectedAfter,
                    actual: row.balanceAfter,
                    message: issueMessage("transaction_balance_mismatch"),
                });
            }

            if (previousBalance !== null && row.balanceBefore !== previousBalance) {
                issues.push({
                    type: "ledger_chain_gap",
                    severity: "error",
                    transactionId: row.id,
                    expected: previousBalance,
                    actual: row.balanceBefore,
                    previousBalance,
                    message: issueMessage("ledger_chain_gap"),
                });
            }

            previousBalance = row.balanceAfter;
            expectedGold = row.balanceAfter;
        }

        if (rows.length === 0 && student.gold !== 0) {
            issues.push({
                type: "missing_ledger",
                severity: "warning",
                expected: null,
                actual: student.gold,
                message: issueMessage("missing_ledger"),
            });
        }

        if (expectedGold !== null && student.gold !== expectedGold) {
            issues.push({
                type: "current_balance_mismatch",
                severity: "error",
                expected: expectedGold,
                actual: student.gold,
                message: issueMessage("current_balance_mismatch"),
            });
        }

        const hasError = issues.some((issue) => issue.severity === "error");
        const status = hasError ? "mismatch" : issues.length > 0 ? "warning" : "ok";

        return {
            studentId: student.id,
            name: student.name,
            nickname: student.nickname ?? null,
            currentGold: student.gold,
            openingBalance,
            expectedGold,
            ledgerNet,
            transactionCount: rows.length,
            firstTransactionAt: rows[0]?.createdAt.toISOString() ?? null,
            lastTransactionAt: rows.at(-1)?.createdAt.toISOString() ?? null,
            status,
            issues,
        };
    });

    const byIssueType = {
        transaction_balance_mismatch: 0,
        ledger_chain_gap: 0,
        current_balance_mismatch: 0,
        missing_ledger: 0,
    } satisfies Record<EconomyReconciliationIssueType, number>;

    for (const report of reports) {
        for (const issue of report.issues) {
            byIssueType[issue.type] += 1;
        }
    }

    return {
        generatedAt: now.toISOString(),
        summary: {
            studentCount: reports.length,
            okCount: reports.filter((report) => report.status === "ok").length,
            warningCount: reports.filter((report) => report.status === "warning").length,
            mismatchCount: reports.filter((report) => report.status === "mismatch").length,
            issueCount: reports.reduce((sum, report) => sum + report.issues.length, 0),
            transactionCount: transactions.length,
            currentGoldTotal: reports.reduce((sum, report) => sum + report.currentGold, 0),
            expectedGoldTotal: reports.reduce((sum, report) => sum + (report.expectedGold ?? 0), 0),
            unreconciledGoldTotal: reports.reduce(
                (sum, report) => sum + (report.expectedGold === null ? report.currentGold : 0),
                0
            ),
            byIssueType,
        },
        students: reports.sort((a, b) => {
            const rank = { mismatch: 0, warning: 1, ok: 2 };
            const byStatus = rank[a.status] - rank[b.status];
            return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name);
        }),
    };
}
