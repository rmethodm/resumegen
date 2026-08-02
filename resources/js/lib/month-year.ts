/**
 * Resume dates are stored as the text the preview prints — "Jun 2019" — while
 * the editor offers them as two dropdowns. These convert between the two.
 *
 * Either half may stand alone: a resume that says only "2019" is legitimate,
 * and splitting the control shouldn't force a month out of someone who doesn't
 * want to give one.
 */

export const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

export const firstYear = 1965;

export const lastYear = 2050;

/** Built once at module load rather than per render. */
export const years: string[] = [];

for (let year = firstYear; year <= lastYear; year++) {
    years.push(String(year));
}

const pattern = new RegExp(`^(?:(${monthNames.join('|')})\\s*)?(\\d{4})?$`);

export type MonthYear = {
    month: string;
    year: string;
    /** The original text when it fits neither dropdown; '' otherwise. */
    unparsed: string;
};

export function splitMonthYear(value: string): MonthYear {
    const match = value.trim().match(pattern);

    if (match === null) {
        return { month: '', year: '', unparsed: value };
    }

    return { month: match[1] ?? '', year: match[2] ?? '', unparsed: '' };
}

export function joinMonthYear(month: string, year: string): string {
    return [month, year].filter((part) => part !== '').join(' ');
}
